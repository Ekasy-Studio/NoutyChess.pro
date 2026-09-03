import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';
import { getOrCreateProfile } from '@/lib/competitive';

export const dynamic = 'force-dynamic';

function normalizePlayerQuery(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function notificationStatement(
  d1: ReturnType<typeof getD1>,
  userId: string,
  kind: string,
  title: string,
  message: string,
  payload: Record<string, unknown> | null,
  now: number,
) {
  return d1.prepare(`INSERT INTO user_notifications (id, user_id, kind, title, message, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
    crypto.randomUUID(),
    userId,
    kind,
    title,
    message,
    payload ? JSON.stringify(payload) : null,
    now,
  );
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ authenticated: false, friends: [], requests: [], sent: [], invites: [], search: [] });
  try {
    await ensureSchema();
    await getOrCreateProfile(user);
    const d1 = getD1();
    const now = Date.now();
    const url = new URL(request.url);
    const query = normalizePlayerQuery(url.searchParams.get('q'));

    await d1.prepare("UPDATE friend_invites SET status = 'expired' WHERE recipient_id = ? AND status = 'pending' AND expires_at <= ?")
      .bind(user.userId, now).run();

    const [friends, requests, sent, invites] = await Promise.all([
      d1.prepare(`SELECT f.pair_key, p.user_id, p.display_name, p.avatar_emote, p.rating,
          CASE WHEN MAX(COALESCE(pp.last_seen_at, 0)) > ? THEN 1 ELSE 0 END AS online,
          pp.mode AS presence_mode
        FROM friendships f
        JOIN profiles p ON p.user_id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
        LEFT JOIN player_presence pp ON pp.user_id = p.user_id
        WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'accepted'
        GROUP BY f.pair_key, p.user_id
        ORDER BY p.display_name`).bind(now - 45_000, user.userId, user.userId, user.userId).all(),
      d1.prepare(`SELECT f.pair_key, p.user_id, p.display_name, p.avatar_emote, p.rating
        FROM friendships f JOIN profiles p ON p.user_id = f.requested_by
        WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'pending' AND f.requested_by != ?`).bind(user.userId, user.userId, user.userId).all(),
      d1.prepare(`SELECT f.pair_key, p.user_id, p.display_name, p.avatar_emote, p.rating
        FROM friendships f JOIN profiles p ON p.user_id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
        WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'pending' AND f.requested_by = ?`).bind(user.userId, user.userId, user.userId, user.userId).all(),
      d1.prepare(`SELECT i.id, i.room_code, i.expires_at, p.display_name, p.avatar_emote
        FROM friend_invites i JOIN profiles p ON p.user_id = i.sender_id
        WHERE i.recipient_id = ? AND i.status = 'pending' AND i.expires_at > ? ORDER BY i.created_at DESC`).bind(user.userId, now).all(),
    ]);

    let search: unknown[] = [];
    if (query.length >= 2) {
      const escaped = query.replace(/[%_]/g, (character) => `\\${character}`);
      const results = await d1.prepare(`SELECT p.user_id, p.display_name, p.avatar_emote, p.rating,
          CASE WHEN MAX(COALESCE(pp.last_seen_at, 0)) > ? THEN 1 ELSE 0 END AS online,
          pp.mode AS presence_mode,
          f.status AS friendship_status,
          f.requested_by
        FROM profiles p
        LEFT JOIN player_presence pp ON pp.user_id = p.user_id
        LEFT JOIN friendships f ON f.pair_key = CASE
          WHEN ? < p.user_id THEN ? || ':' || p.user_id
          ELSE p.user_id || ':' || ?
        END
        WHERE p.user_id != ?
          AND p.display_name LIKE ? ESCAPE '\\' COLLATE NOCASE
        GROUP BY p.user_id
        ORDER BY CASE WHEN p.display_name = ? COLLATE NOCASE THEN 0 ELSE 1 END,
          p.display_name COLLATE NOCASE
        LIMIT 12`)
        .bind(now - 45_000, user.userId, user.userId, user.userId, user.userId, `%${escaped}%`, query)
        .all();
      search = results.results ?? [];
    }

    return NextResponse.json({
      authenticated: true,
      friends: friends.results,
      requests: requests.results,
      sent: sent.results,
      invites: invites.results,
      search,
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar seus amigos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Entre com sua conta para usar amigos.' }, { status: 401 });
  try {
    await ensureSchema();
    const profile = await getOrCreateProfile(user);
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const d1 = getD1();
    const now = Date.now();

    if (profile.bannedUntil && profile.bannedUntil > now) {
      return NextResponse.json({ error: 'Sua conta está temporariamente suspensa.' }, { status: 403 });
    }

    if (action === 'request') {
      const friendId = typeof body.friendId === 'string' ? body.friendId.slice(0, 200) : '';
      const friendName = normalizePlayerQuery(body.friendName);
      const friend = friendId
        ? await d1.prepare('SELECT user_id, display_name FROM profiles WHERE user_id = ? LIMIT 1').bind(friendId).first<{ user_id: string; display_name: string }>()
        : friendName
          ? await d1.prepare('SELECT user_id, display_name FROM profiles WHERE display_name = ? COLLATE NOCASE LIMIT 1').bind(friendName).first<{ user_id: string; display_name: string }>()
          : null;
      if (!friend || friend.user_id === user.userId) throw new Error('Jogador não encontrado.');
      const [userA, userB] = [user.userId, friend.user_id].sort((a, b) => a.localeCompare(b));
      const pairKey = `${userA}:${userB}`;
      const existing = await d1.prepare('SELECT status, requested_by FROM friendships WHERE pair_key = ?').bind(pairKey).first<{ status: string; requested_by: string }>();
      if (existing?.status === 'blocked') throw new Error('Não é possível enviar solicitação para este jogador.');
      if (existing?.status === 'accepted') return NextResponse.json({ ok: true, status: 'accepted' });
      if (existing?.status === 'pending' && existing.requested_by === user.userId) return NextResponse.json({ ok: true, status: 'pending' });

      if (existing?.status === 'pending' && existing.requested_by !== user.userId) {
        const accepted = await d1.prepare("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE pair_key = ? AND status = 'pending'")
          .bind(now, pairKey).run();
        if ((accepted.meta.changes ?? 0) !== 1) throw new Error('Não foi possível aceitar a solicitação existente.');
        await notificationStatement(d1, friend.user_id, 'friendship', 'Amizade aceita', `${profile.displayName} aceitou sua solicitação de amizade.`, { pairKey }, now).run();
        return NextResponse.json({ ok: true, status: 'accepted' });
      }

      const recentRequests = await d1.prepare("SELECT COUNT(*) AS total FROM friendships WHERE requested_by = ? AND status = 'pending' AND updated_at > ?")
        .bind(user.userId, now - 60_000).first<{ total: number }>();
      if (Number(recentRequests?.total ?? 0) >= 8) throw new Error('Muitas solicitações em pouco tempo. Aguarde um minuto.');

      await d1.prepare(`INSERT INTO friendships (pair_key, user_a, user_b, requested_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)
        ON CONFLICT(pair_key) DO UPDATE SET requested_by = excluded.requested_by, status = 'pending', updated_at = excluded.updated_at WHERE friendships.status != 'accepted'`)
        .bind(pairKey, userA, userB, user.userId, now, now).run();
      const persisted = await d1.prepare('SELECT pair_key, status, requested_by FROM friendships WHERE pair_key = ?').bind(pairKey).first();
      if (!persisted) throw new Error('Não foi possível salvar a solicitação.');
      await notificationStatement(d1, friend.user_id, 'friendship', 'Nova solicitação de amizade', `${profile.displayName} quer adicionar você como amigo.`, { pairKey, requesterId: user.userId }, now).run();
      return NextResponse.json({ ok: true, status: 'pending', friendship: persisted });
    }

    if (action === 'accept' || action === 'remove') {
      const pairKey = typeof body.pairKey === 'string' ? body.pairKey.slice(0, 420) : '';
      const friendship = await d1.prepare('SELECT user_a, user_b, requested_by, status FROM friendships WHERE pair_key = ?').bind(pairKey).first<Record<string, unknown>>();
      if (!friendship || (friendship.user_a !== user.userId && friendship.user_b !== user.userId)) throw new Error('Amizade inválida.');
      if (action === 'accept') {
        if (friendship.requested_by === user.userId || friendship.status !== 'pending') throw new Error('Solicitação inválida.');
        const result = await d1.prepare("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE pair_key = ? AND status = 'pending'").bind(now, pairKey).run();
        if ((result.meta.changes ?? 0) !== 1) throw new Error('Não foi possível aceitar a solicitação.');
        await notificationStatement(d1, String(friendship.requested_by), 'friendship', 'Amizade aceita', `${profile.displayName} aceitou sua solicitação de amizade.`, { pairKey }, now).run();
      } else {
        await d1.prepare('DELETE FROM friendships WHERE pair_key = ?').bind(pairKey).run();
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'invite') {
      const friendId = typeof body.friendId === 'string' ? body.friendId.slice(0, 200) : '';
      const roomCode = typeof body.roomCode === 'string' ? body.roomCode.toUpperCase() : '';
      if (!/^[A-Z2-9]{6}$/.test(roomCode)) throw new Error('Sala inválida.');
      const friendship = await d1.prepare("SELECT pair_key FROM friendships WHERE ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)) AND status = 'accepted'")
        .bind(user.userId, friendId, friendId, user.userId).first();
      const room = await d1.prepare("SELECT host_id, guest_id, last_seen_at FROM rooms WHERE code = ? AND status IN ('waiting','playing')").bind(roomCode).first<{ host_id: string; guest_id: string | null; last_seen_at: number }>();
      if (!friendship || !room || room.host_id !== user.userId || room.last_seen_at <= now - 90_000) throw new Error('Convite inválido.');
      if (room.guest_id && room.guest_id !== friendId) throw new Error('A sala já possui outro jogador.');
      const recentInvite = await d1.prepare('SELECT created_at FROM friend_invites WHERE sender_id = ? AND recipient_id = ? ORDER BY created_at DESC LIMIT 1')
        .bind(user.userId, friendId).first<{ created_at: number }>();
      if (recentInvite && now - recentInvite.created_at < 10_000) throw new Error('Aguarde antes de enviar outro convite.');
      const inviteId = crypto.randomUUID();
      await d1.batch([
        d1.prepare("UPDATE friend_invites SET status = 'expired' WHERE sender_id = ? AND recipient_id = ? AND status = 'pending'").bind(user.userId, friendId),
        d1.prepare("INSERT INTO friend_invites (id, sender_id, recipient_id, room_code, status, created_at, expires_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)")
          .bind(inviteId, user.userId, friendId, roomCode, now, now + 15 * 60_000),
        notificationStatement(d1, friendId, 'game-invite', 'Convite para jogar', `${profile.displayName} convidou você para uma partida.`, { inviteId, roomCode, senderId: user.userId }, now),
      ]);
      return NextResponse.json({ ok: true, inviteId });
    }

    if (action === 'accept-invite') {
      const inviteId = typeof body.inviteId === 'string' ? body.inviteId.slice(0, 100) : '';
      const invite = await d1.prepare("SELECT sender_id, room_code, expires_at FROM friend_invites WHERE id = ? AND recipient_id = ? AND status = 'pending'")
        .bind(inviteId, user.userId).first<{ sender_id: string; room_code: string; expires_at: number }>();
      if (!invite || invite.expires_at < now) throw new Error('O convite expirou.');

      const [friendship, room] = await Promise.all([
        d1.prepare("SELECT pair_key FROM friendships WHERE ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)) AND status = 'accepted'")
          .bind(user.userId, invite.sender_id, invite.sender_id, user.userId).first(),
        d1.prepare("SELECT host_id, guest_id, status, last_seen_at FROM rooms WHERE code = ?")
          .bind(invite.room_code).first<{ host_id: string; guest_id: string | null; status: string; last_seen_at: number }>(),
      ]);

      if (!friendship || !room || room.host_id !== invite.sender_id || !['waiting', 'playing'].includes(room.status) || room.last_seen_at <= now - 90_000) {
        await d1.prepare("UPDATE friend_invites SET status = 'expired' WHERE id = ? AND status = 'pending'").bind(inviteId).run();
        throw new Error('A sala deste convite não está mais disponível.');
      }
      if (room.guest_id && room.guest_id !== user.userId) {
        await d1.prepare("UPDATE friend_invites SET status = 'expired' WHERE id = ? AND status = 'pending'").bind(inviteId).run();
        throw new Error('A sala já está completa.');
      }

      const accepted = await d1.prepare("UPDATE friend_invites SET status = 'accepted' WHERE id = ? AND recipient_id = ? AND status = 'pending'")
        .bind(inviteId, user.userId).run();
      if ((accepted.meta.changes ?? 0) !== 1) throw new Error('Este convite já foi utilizado.');
      return NextResponse.json({ ok: true, roomCode: invite.room_code });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Operação inválida.' }, { status: 400 });
  }
}
