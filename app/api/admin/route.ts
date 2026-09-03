import { NextResponse } from 'next/server';

import { ensureSchema, getD1 } from '@/db';
import { AdminAccessError, requireAdmin, requireSameOriginAdminMutation } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const ALLOWED_BADGES = new Set(['', 'fundador', 'fair-play', 'campeao-evento', 'apoiador-ekasy', 'lenda-comunidade']);
const ALLOWED_COSMETICS = new Set(['', 'board:midnight', 'board:royal', 'board:ocean', 'board:obsidian', 'pieces:neo', 'pieces:royal']);

function responseError(error: unknown) {
  if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível concluir a operação administrativa.' }, { status: 500 });
}

async function readPlayer(d1: ReturnType<typeof getD1>, userId: string) {
  return d1.prepare(`SELECT user_id, display_name, avatar_emote, profile_title, board_theme, piece_theme, rating, peak_rating,
      games, wins, draws, losses, coins, xp, level, banned_until, ban_reason, chat_muted_until, chat_mute_reason,
      membership_tier, member_since, member_until, updated_at
    FROM profiles WHERE user_id = ?`).bind(userId).first<Record<string, unknown>>();
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
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), userId, kind, title, message, payload ? JSON.stringify(payload) : null, now);
}

export async function GET() {
  try {
    await requireAdmin();
    await ensureSchema();
    const d1 = getD1();
    const now = Date.now();
    const [users, rooms, games, actions, counters, settings, chat, presence, membershipRequests] = await Promise.all([
      d1.prepare('SELECT user_id, display_name, avatar_emote, profile_title, board_theme, piece_theme, rating, games, wins, draws, losses, coins, xp, level, banned_until, ban_reason, chat_muted_until, chat_mute_reason, membership_tier, member_since, member_until, updated_at FROM profiles ORDER BY updated_at DESC LIMIT 100').all(),
      d1.prepare("SELECT code, host_id, guest_id, status, matchmaking, created_at, last_seen_at FROM rooms ORDER BY last_seen_at DESC LIMIT 100").all(),
      d1.prepare('SELECT id, room_code, white_id, black_id, result, white_rating_after, black_rating_after, finished_at FROM games ORDER BY finished_at DESC LIMIT 100').all(),
      d1.prepare('SELECT id, admin_id, target_user_id, room_code, action, reason, created_at FROM moderation_actions ORDER BY created_at DESC LIMIT 80').all(),
      d1.prepare(`SELECT
        (SELECT COUNT(*) FROM profiles) AS users,
        (SELECT COUNT(*) FROM player_presence) AS unique_visitors,
        (SELECT COUNT(*) FROM visit_sessions) AS sessions,
        (SELECT COUNT(*) FROM player_presence WHERE last_seen_at > ?) AS online_players,
        (SELECT COUNT(*) FROM rooms WHERE status IN ('waiting','playing')) AS active_rooms,
        (SELECT COUNT(*) FROM rooms WHERE matchmaking = 1 AND status = 'waiting' AND last_seen_at > ?) AS matchmaking_players,
        (SELECT COUNT(*) FROM games) AS games,
        (SELECT COUNT(*) FROM profiles WHERE banned_until > ?) AS banned`).bind(now - 45_000, now - 90_000, now).first(),
      d1.prepare("SELECT key, value, updated_at FROM app_settings WHERE key = 'pix_key'").first(),
      d1.prepare('SELECT id, user_id, display_name, avatar_emote, message, room_code, scope, created_at, deleted_at FROM community_messages ORDER BY created_at DESC LIMIT 100').all(),
      d1.prepare('SELECT visitor_id, user_id, display_name, room_code, mode, first_seen_at, last_seen_at FROM player_presence WHERE last_seen_at > ? ORDER BY last_seen_at DESC LIMIT 200').bind(now - 45_000).all(),
      d1.prepare(`SELECT mi.user_id, mi.status, mi.created_at, mi.updated_at, p.display_name, p.avatar_emote, p.rating, p.level
        FROM membership_interest mi
        JOIN profiles p ON p.user_id = mi.user_id
        WHERE mi.status = 'interested'
        ORDER BY mi.updated_at ASC
        LIMIT 100`).all(),
    ]);
    return NextResponse.json({
      users: users.results,
      rooms: rooms.results,
      games: games.results,
      actions: actions.results,
      counters,
      settings,
      chat: chat.results,
      presence: presence.results,
      membershipRequests: membershipRequests.results,
      serverTime: now,
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOriginAdminMutation(request);
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
      const result = await d1.prepare('UPDATE profiles SET banned_until = ?, ban_reason = ?, updated_at = ? WHERE user_id = ?')
        .bind(until, action === 'ban' ? reason : null, now, userId).run();
      if ((result.meta.changes ?? 0) !== 1) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });
      await d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(admin.userId, userId, action, reason, now).run();
      return NextResponse.json({ ok: true, persisted: await readPlayer(d1, userId) });
    }

    if (action === 'adjust-player') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const rating = Math.max(100, Math.min(3000, Math.round(Number(body.rating))));
      const coins = Math.max(0, Math.min(1_000_000, Math.round(Number(body.coins))));
      if (!userId || !Number.isFinite(rating) || !Number.isFinite(coins)) return NextResponse.json({ error: 'Valores inválidos.' }, { status: 400 });
      const result = await d1.prepare('UPDATE profiles SET rating = ?, peak_rating = MAX(peak_rating, ?), coins = ?, updated_at = ? WHERE user_id = ?')
        .bind(rating, rating, coins, now, userId).run();
      if ((result.meta.changes ?? 0) !== 1) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });
      await d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(admin.userId, userId, action, reason, now).run();
      return NextResponse.json({ ok: true, persisted: await readPlayer(d1, userId) });
    }

    if (action === 'grant-reward') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const coins = Math.max(0, Math.min(100_000, Math.round(Number(body.rewardCoins) || 0)));
      const xp = Math.max(0, Math.min(100_000, Math.round(Number(body.rewardXp) || 0)));
      const badge = typeof body.badge === 'string' ? body.badge.slice(0, 40) : '';
      const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim().slice(0, 100)
        : crypto.randomUUID();
      if (!userId || (!coins && !xp && !badge) || !ALLOWED_BADGES.has(badge)) return NextResponse.json({ error: 'Recompensa inválida.' }, { status: 400 });
      const claim = await d1.prepare('INSERT OR IGNORE INTO processed_rewards (idempotency_key, user_id, reward_type, xp, coins, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(idempotencyKey, userId, badge || 'admin-custom', xp, coins, now).run();
      if ((claim.meta.changes ?? 0) !== 1) return NextResponse.json({ ok: true, duplicate: true, persisted: await readPlayer(d1, userId) });
      const statements = [
        d1.prepare('UPDATE profiles SET coins = MIN(1000000, coins + ?), xp = MIN(10000000, xp + ?), level = MAX(level, 1 + CAST((xp + ?) / 500 AS INTEGER)), updated_at = ? WHERE user_id = ?')
          .bind(coins, xp, xp, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(admin.userId, userId, `grant-reward:${coins}:${xp}:${badge || 'sem-insignia'}`, reason, now),
        notificationStatement(d1, userId, 'reward', 'Você recebeu uma recompensa', `${coins ? `+${coins.toLocaleString('pt-BR')} moedas` : ''}${coins && xp ? ' · ' : ''}${xp ? `+${xp.toLocaleString('pt-BR')} XP` : ''}${badge ? `${coins || xp ? ' · ' : ''}Insígnia ${badge}` : ''}`, { coins, xp, badge }, now),
      ];
      if (badge) statements.push(d1.prepare('INSERT OR IGNORE INTO achievements (user_id, code, unlocked_at) VALUES (?, ?, ?)').bind(userId, badge, now));
      await d1.batch(statements);
      return NextResponse.json({ ok: true, idempotencyKey, persisted: await readPlayer(d1, userId) });
    }

    if (action === 'grant-cosmetic') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const cosmeticCode = typeof body.cosmeticCode === 'string' ? body.cosmeticCode.slice(0, 40) : '';
      if (!userId || !ALLOWED_COSMETICS.has(cosmeticCode) || !cosmeticCode) return NextResponse.json({ error: 'Cosmético inválido.' }, { status: 400 });
      await d1.batch([
        d1.prepare('INSERT OR REPLACE INTO cosmetic_unlocks (user_id, cosmetic_code, granted_by, acquired_at) VALUES (?, ?, ?, ?)').bind(userId, cosmeticCode, admin.userId, now),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, `${action}:${cosmeticCode}`, reason, now),
        notificationStatement(d1, userId, 'cosmetic', 'Novo item desbloqueado', `Você recebeu ${cosmeticCode}.`, { cosmeticCode }, now),
      ]);
      const unlock = await d1.prepare('SELECT cosmetic_code, acquired_at FROM cosmetic_unlocks WHERE user_id = ? AND cosmetic_code = ?').bind(userId, cosmeticCode).first();
      if (!unlock) return NextResponse.json({ error: 'Não foi possível confirmar o cosmético.' }, { status: 500 });
      return NextResponse.json({ ok: true, persisted: unlock });
    }

    if (action === 'grant-membership' || action === 'revoke-membership') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      if (!userId) return NextResponse.json({ error: 'Jogador inválido.' }, { status: 400 });
      const days = Math.max(1, Math.min(730, Math.round(Number(body.days) || 30)));
      const current = await readPlayer(d1, userId);
      if (!current) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });
      const currentUntil = Number(current.member_until ?? 0);
      const memberUntil = action === 'grant-membership'
        ? Math.max(now, Number.isFinite(currentUntil) ? currentUntil : 0) + days * 86_400_000
        : null;
      const statements = [
        d1.prepare('UPDATE profiles SET membership_tier = ?, member_since = ?, member_until = ?, updated_at = ? WHERE user_id = ?')
          .bind(action === 'grant-membership' ? 'legend' : 'free', action === 'grant-membership' ? (current.member_since ?? now) : null, memberUntil, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(admin.userId, userId, `${action}:${days}`, reason, now),
      ];
      if (action === 'grant-membership') {
        statements.push(
          d1.prepare("INSERT INTO membership_interest (user_id, status, created_at, updated_at) VALUES (?, 'activated', ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = 'activated', updated_at = excluded.updated_at").bind(userId, now, now),
          notificationStatement(d1, userId, 'membership', 'Clube Lendário ativado', `Seu acesso ao Clube Lendário foi ativado por ${days} dias.`, { days, memberUntil }, now),
        );
      }
      await d1.batch(statements);
      return NextResponse.json({ ok: true, persisted: await readPlayer(d1, userId) });
    }

    if (action === 'review-membership') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const decision = body.decision === 'approve' ? 'approve' : body.decision === 'decline' ? 'decline' : '';
      const days = Math.max(1, Math.min(730, Math.round(Number(body.days) || 30)));
      if (!userId || !decision) return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 400 });
      const interest = await d1.prepare('SELECT status FROM membership_interest WHERE user_id = ?').bind(userId).first<{ status: string }>();
      if (!interest || interest.status !== 'interested') return NextResponse.json({ error: 'Esta solicitação não está mais pendente.' }, { status: 409 });
      if (decision === 'decline') {
        await d1.batch([
          d1.prepare("UPDATE membership_interest SET status = 'declined', updated_at = ? WHERE user_id = ? AND status = 'interested'").bind(now, userId),
          d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, 'decline-membership', reason, now),
          notificationStatement(d1, userId, 'membership', 'Solicitação do Clube atualizada', 'Sua solicitação ao Clube Lendário não foi aprovada neste momento.', null, now),
        ]);
        return NextResponse.json({ ok: true, status: 'declined' });
      }
      const current = await readPlayer(d1, userId);
      if (!current) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });
      const currentUntil = Number(current.member_until ?? 0);
      const memberUntil = Math.max(now, Number.isFinite(currentUntil) ? currentUntil : 0) + days * 86_400_000;
      await d1.batch([
        d1.prepare('UPDATE profiles SET membership_tier = ?, member_since = ?, member_until = ?, updated_at = ? WHERE user_id = ?')
          .bind('legend', current.member_since ?? now, memberUntil, now, userId),
        d1.prepare("UPDATE membership_interest SET status = 'activated', updated_at = ? WHERE user_id = ? AND status = 'interested'").bind(now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, `approve-membership:${days}`, reason, now),
        notificationStatement(d1, userId, 'membership', 'Bem-vindo ao Clube Lendário', `Sua solicitação foi aprovada. Você recebeu ${days} dias de Clube Lendário.`, { days, memberUntil }, now),
      ]);
      return NextResponse.json({ ok: true, status: 'activated', persisted: await readPlayer(d1, userId) });
    }

    if (action === 'grant-founder-gift') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const coins = Math.max(0, Math.min(100_000, Math.round(Number(body.rewardCoins) || 0)));
      const xp = Math.max(0, Math.min(100_000, Math.round(Number(body.rewardXp) || 0)));
      const badge = typeof body.badge === 'string' ? body.badge.slice(0, 40) : '';
      const cosmeticCode = typeof body.cosmeticCode === 'string' ? body.cosmeticCode.slice(0, 40) : '';
      const memberDays = Math.max(0, Math.min(730, Math.round(Number(body.memberDays) || 0)));
      const giftId = typeof body.giftId === 'string' && body.giftId.trim() ? body.giftId.trim().slice(0, 100) : crypto.randomUUID();
      if (!userId || (!coins && !xp && !badge && !cosmeticCode && !memberDays)) return NextResponse.json({ error: 'Escolha pelo menos um item para o presente.' }, { status: 400 });
      if (!ALLOWED_BADGES.has(badge) || !ALLOWED_COSMETICS.has(cosmeticCode)) return NextResponse.json({ error: 'Conteúdo do presente inválido.' }, { status: 400 });
      const current = await readPlayer(d1, userId);
      if (!current) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });
      const claim = await d1.prepare('INSERT OR IGNORE INTO processed_rewards (idempotency_key, user_id, reward_type, xp, coins, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(giftId, userId, 'founder-gift', xp, coins, now).run();
      if ((claim.meta.changes ?? 0) !== 1) return NextResponse.json({ ok: true, duplicate: true, giftId, persisted: current });

      const currentUntil = Number(current.member_until ?? 0);
      const memberUntil = memberDays ? Math.max(now, Number.isFinite(currentUntil) ? currentUntil : 0) + memberDays * 86_400_000 : null;
      const statements = [
        d1.prepare('UPDATE profiles SET coins = MIN(1000000, coins + ?), xp = MIN(10000000, xp + ?), level = MAX(level, 1 + CAST((xp + ?) / 500 AS INTEGER)), updated_at = ? WHERE user_id = ?')
          .bind(coins, xp, xp, now, userId),
        d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(admin.userId, userId, `founder-gift:${giftId}`, reason, now),
        notificationStatement(d1, userId, 'founder-gift', 'Presente do Fundador', 'Você recebeu um presente especial do fundador da Ekasy-Studio.', { giftId, coins, xp, badge, cosmeticCode, memberDays }, now),
      ];
      if (badge) statements.push(d1.prepare('INSERT OR IGNORE INTO achievements (user_id, code, unlocked_at) VALUES (?, ?, ?)').bind(userId, badge, now));
      if (cosmeticCode) statements.push(d1.prepare('INSERT OR REPLACE INTO cosmetic_unlocks (user_id, cosmetic_code, granted_by, acquired_at) VALUES (?, ?, ?, ?)').bind(userId, cosmeticCode, admin.userId, now));
      if (memberDays && memberUntil) {
        statements.push(
          d1.prepare('UPDATE profiles SET membership_tier = ?, member_since = ?, member_until = ?, updated_at = ? WHERE user_id = ?')
            .bind('legend', current.member_since ?? now, memberUntil, now, userId),
          d1.prepare("INSERT INTO membership_interest (user_id, status, created_at, updated_at) VALUES (?, 'activated', ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = 'activated', updated_at = excluded.updated_at").bind(userId, now, now),
        );
      }
      await d1.batch(statements);
      return NextResponse.json({ ok: true, giftId, persisted: await readPlayer(d1, userId) });
    }

    if (action === 'mute-chat' || action === 'unmute-chat') {
      const userId = typeof body.userId === 'string' ? body.userId.slice(0, 200) : '';
      const minutes = Math.max(1, Math.min(525_600, Math.round(Number(body.minutes) || 60)));
      const mutedUntil = action === 'mute-chat' ? now + minutes * 60_000 : null;
      if (!userId) return NextResponse.json({ error: 'Jogador inválido.' }, { status: 400 });
      const result = await d1.prepare('UPDATE profiles SET chat_muted_until = ?, chat_mute_reason = ?, updated_at = ? WHERE user_id = ?')
        .bind(mutedUntil, action === 'mute-chat' ? reason : null, now, userId).run();
      if ((result.meta.changes ?? 0) !== 1) return NextResponse.json({ error: 'Jogador não encontrado.' }, { status: 404 });
      await d1.prepare('INSERT INTO moderation_actions (admin_id, target_user_id, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, userId, action, reason, now).run();
      return NextResponse.json({ ok: true, persisted: await readPlayer(d1, userId) });
    }

    if (action === 'delete-chat-message') {
      const messageId = Math.round(Number(body.messageId));
      if (!Number.isInteger(messageId) || messageId < 1) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
      const result = await d1.prepare('UPDATE community_messages SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL').bind(now, admin.userId, messageId).run();
      if ((result.meta.changes ?? 0) !== 1) return NextResponse.json({ error: 'Mensagem não encontrada ou já removida.' }, { status: 404 });
      await d1.prepare('INSERT INTO moderation_actions (admin_id, action, reason, created_at) VALUES (?, ?, ?, ?)').bind(admin.userId, action, reason, now).run();
      return NextResponse.json({ ok: true, persisted: { id: messageId, deleted_at: now } });
    }

    if (action === 'terminate-room') {
      const roomCode = typeof body.roomCode === 'string' ? body.roomCode.toUpperCase().slice(0, 6) : '';
      if (!/^[A-Z2-9]{6}$/.test(roomCode)) return NextResponse.json({ error: 'Sala inválida.' }, { status: 400 });
      const result = await d1.prepare("UPDATE rooms SET status = 'terminated', last_seen_at = ? WHERE code = ? AND status != 'terminated'").bind(now, roomCode).run();
      if ((result.meta.changes ?? 0) !== 1) return NextResponse.json({ error: 'Sala não encontrada ou já encerrada.' }, { status: 404 });
      await d1.prepare('INSERT INTO moderation_actions (admin_id, room_code, action, reason, created_at) VALUES (?, ?, ?, ?, ?)').bind(admin.userId, roomCode, action, reason, now).run();
      const persisted = await d1.prepare('SELECT code, host_id, guest_id, status, matchmaking, last_seen_at FROM rooms WHERE code = ?').bind(roomCode).first();
      return NextResponse.json({ ok: true, persisted });
    }

    if (action === 'update-pix') {
      const pixKey = typeof body.pixKey === 'string' ? body.pixKey.trim().slice(0, 140) : '';
      await d1.batch([
        d1.prepare("INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ('pix_key', ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(pixKey, admin.userId, now),
        d1.prepare('INSERT INTO moderation_actions (admin_id, action, reason, created_at) VALUES (?, ?, ?, ?)').bind(admin.userId, action, reason, now),
      ]);
      const persisted = await d1.prepare("SELECT key, value, updated_at FROM app_settings WHERE key = 'pix_key'").first<{ key: string; value: string; updated_at: number }>();
      if (!persisted || persisted.value !== pixKey) return NextResponse.json({ error: 'A chave Pix não pôde ser confirmada no banco.' }, { status: 500 });
      return NextResponse.json({ ok: true, persisted });
    }

    return NextResponse.json({ error: 'Ação administrativa desconhecida.' }, { status: 400 });
  } catch (error) {
    return responseError(error);
  }
}