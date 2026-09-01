import { NextResponse } from 'next/server';

import { ensureSchema, getD1 } from '@/db';
import { AdminAccessError, requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function responseError(error: unknown) {
  if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: 'Não foi possível concluir a operação administrativa.' }, { status: 500 });
}

export async function GET() {
  try {
    await requireAdmin();
    await ensureSchema();
    const d1 = getD1();
    const [users, rooms, games, actions, counters, settings, chat, presence] = await Promise.all([
      d1.prepare('SELECT user_id, display_name, avatar_emote, profile_title, board_theme, piece_theme, rating, games, wins, draws, losses, coins, xp, level, banned_until, ban_reason, chat_muted_until, chat_mute_reason, membership_tier, member_since, member_until, updated_at FROM profiles ORDER BY updated_at DESC LIMIT 100').all(),
      d1.prepare("SELECT code, host_id, guest_id, status, created_at, last_seen_at FROM rooms ORDER BY last_seen_at DESC LIMIT 100").all(),
      d1.prepare('SELECT id, room_code, white_id, black_id, result, white_rating_after, black_rating_after, finished_at FROM games ORDER BY finished_at DESC LIMIT 100').all(),
      d1.prepare('SELECT id, admin_id, target_user_id, room_code, action, reason, created_at FROM moderation_actions ORDER BY created_at DESC LIMIT 50').all(),
      d1.prepare(`SELECT
        (SELECT COUNT(*) FROM profiles) AS users,
        (SELECT COUNT(*) FROM player_presence) AS unique_visitors,
        (SELECT COUNT(*) FROM visit_sessions) AS sessions,
        (SELECT COUNT(*) FROM player_presence WHERE last_seen_at > ?) AS online_players,
        (SELECT COUNT(*) FROM rooms WHERE status IN ('waiting','playing')) AS active_rooms,
        (SELECT COUNT(*) FROM games) AS games,
        (SELECT COUNT(*) FROM profiles WHERE banned_until > ?) AS banned`).bind(Date.now() - 45_000, Date.now()).first(),
      d1.prepare("SELECT key, value, updated_at FROM app_settings WHERE key = 'pix_key'").first(),
      d1.prepare('SELECT id, user_id, display_name, avatar_emote, message, room_code, scope, created_at, deleted_at FROM community_messages ORDER BY created_at DESC LIMIT 100').all(),
      d1.prepare('SELECT visitor_id, user_id, display_name, room_code, mode, first_seen_at, last_seen_at FROM player_presence WHERE last_seen_at > ? ORDER BY last_seen_at DESC LIMIT 200').bind(Date.now() - 45_000).all(),
    ]);
    return NextResponse.json({ users: users.results, rooms: rooms.results, games: games.results, actions: actions.results, counters, settings, chat: chat.results, presence: presence.results });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    await ensureSchema();
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 240) : '';
    if (!reason) return NextResponse.json({ error: 'Informe o motivo para manter a trilha de auditoria.' }, { status: 400 });
    const d1 = getD1();
    const now = Date.now();

    if (action === 'ban' || action === 'unban') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      if (!userId) return NextResponse.json({ error: 'Jogador inválido.' }, { status: 400 });
      const days = Math.max(1, Math.min(3650, Number(body.days) || 7));
      const until = action === 'ban' ? now + days * 86_400_000 : null;
      await d1.batch([
        d1.prepare('UPDATE profiles SET banned_until = ?, ban_reason = ?, updated_at = ? WHERE user_id = ?').bind(until, action === 'ban' ? reason : null, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, action, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'adjust-player') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const rating = Math.max(100, Math.min(3000, Math.round(Number(body.rating))));
      const coins = Math.max(0, Math.min(1_000_000, Math.round(Number(body.coins))));
      if (!userId || !Number.isFinite(rating) || !Number.isFinite(coins)) return NextResponse.json({ error: 'Valores inválidos.' }, { status: 400 });
      await d1.batch([
        d1.prepare('UPDATE profiles SET rating = ?, peak_rating = MAX(peak_rating, ?), coins = ?, updated_at = ? WHERE user_id = ?').bind(rating, rating, coins, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, action, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'grant-reward') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const coins = Math.max(0, Math.min(100_000, Math.round(Number(body.rewardCoins) || 0)));
      const xp = Math.max(0, Math.min(100_000, Math.round(Number(body.rewardXp) || 0)));
      const badge = typeof body.badge === 'string' ? body.badge.slice(0, 40) : '';
      const allowedBadges = new Set(['', 'fundador', 'fair-play', 'campeao-evento', 'apoiador-ekasy', 'lenda-comunidade']);
      if (!userId || (!coins && !xp && !badge) || !allowedBadges.has(badge)) return NextResponse.json({ error: 'Recompensa inválida.' }, { status: 400 });
      const statements = [
        d1.prepare('UPDATE profiles SET coins = MIN(1000000, coins + ?), xp = MIN(10000000, xp + ?), level = MAX(level, 1 + CAST((xp + ?) / 500 AS INTEGER)), updated_at = ? WHERE user_id = ?')
          .bind(coins, xp, xp, now, userId),
        d1.prepare('INSERT INTO processed_rewards (idempotency_key, user_id, reward_type, xp, coins, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), userId, badge || 'admin-custom', xp, coins, now),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(admin.userId, userId, `grant-reward:${coins}:${xp}:${badge || 'sem-insignia'}`, reason, now),
      ];
      if (badge) statements.push(d1.prepare('INSERT OR IGNORE INTO achievements (user_id, code, unlocked_at) VALUES (?, ?, ?)').bind(userId, badge, now));
      await d1.batch(statements);
      return NextResponse.json({ ok: true });
    }

    if (action === 'grant-cosmetic') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const cosmeticCode = typeof body.cosmeticCode === 'string' ? body.cosmeticCode.slice(0, 40) : '';
      const allowed = new Set(['board:midnight', 'board:royal', 'board:ocean', 'board:obsidian', 'pieces:neo', 'pieces:royal']);
      if (!userId || !allowed.has(cosmeticCode)) return NextResponse.json({ error: 'Cosmético inválido.' }, { status: 400 });
      await d1.batch([
        d1.prepare('INSERT OR REPLACE INTO cosmetic_unlocks (user_id, cosmetic_code, granted_by, acquired_at) VALUES (?, ?, ?, ?)').bind(userId, cosmeticCode, admin.userId, now),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, `${action}:${cosmeticCode}`, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'grant-membership' || action === 'revoke-membership') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      if (!userId) return NextResponse.json({ error: 'Jogador inválido.' }, { status: 400 });
      const days = Math.max(1, Math.min(730, Math.round(Number(body.days) || 30)));
      const memberUntil = action === 'grant-membership' ? now + days * 86_400_000 : null;
      await d1.batch([
        d1.prepare('UPDATE profiles SET membership_tier = ?, member_since = ?, member_until = ?, updated_at = ? WHERE user_id = ?')
          .bind(action === 'grant-membership' ? 'legend' : 'free', action === 'grant-membership' ? now : null, memberUntil, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(admin.userId, userId, `${action}:${days}`, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'mute-chat' || action === 'unmute-chat') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const minutes = Math.max(1, Math.min(525_600, Math.round(Number(body.minutes) || 60)));
      const mutedUntil = action === 'mute-chat' ? now + minutes * 60_000 : null;
      if (!userId) return NextResponse.json({ error: 'Jogador inválido.' }, { status: 400 });
      await d1.batch([
        d1.prepare('UPDATE profiles SET chat_muted_until = ?, chat_mute_reason = ?, updated_at = ? WHERE user_id = ?').bind(mutedUntil, action === 'mute-chat' ? reason : null, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, action, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete-chat-message') {
      const messageId = Math.round(Number(body.messageId));
      if (!Number.isInteger(messageId) || messageId < 1) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
      await d1.batch([
        d1.prepare('UPDATE community_messages SET deleted_at = ?, deleted_by = ? WHERE id = ?').bind(now, admin.userId, messageId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, action, reason, created_at) VALUES (?, ?, ?, ?)').bind(admin.userId, action, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'terminate-room') {
      const roomCode = typeof body.roomCode === 'string' ? body.roomCode.toUpperCase().slice(0, 6) : '';
      if (!/^[A-Z2-9]{6}$/.test(roomCode)) return NextResponse.json({ error: 'Sala inválida.' }, { status: 400 });
      await d1.batch([
        d1.prepare("UPDATE rooms SET status = 'terminated', last_seen_at = ? WHERE code = ?").bind(now, roomCode),
        d1.prepare('INSERT INTO moderation_actions (admin_id, room_code, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, roomCode, action, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'update-pix') {
      const pixKey = typeof body.pixKey === 'string' ? body.pixKey.trim().slice(0, 140) : '';
      await d1.batch([
        d1.prepare("INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ('pix_key', ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(pixKey, admin.userId, now),
        d1.prepare('INSERT INTO moderation_actions (admin_id, action, reason, created_at) VALUES (?, ?, ?, ?)').bind(admin.userId, action, reason, now),
      ]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ação administrativa desconhecida.' }, { status: 400 });
  } catch (error) {
    return responseError(error);
  }
}
