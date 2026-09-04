import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';
import { RequestSecurityError, requireSameOriginJsonMutation } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

const ALLOWED_MODES = new Set(['menu', 'computer', 'academy', 'local', 'online', 'matchmaking', 'playing']);

export async function GET() {
  try {
    await ensureSchema();
    const d1 = getD1();
    const now = Date.now();
    const counters = await d1.prepare(`SELECT
      (SELECT COUNT(*) FROM player_presence WHERE last_seen_at > ?) AS online,
      (SELECT COUNT(*) FROM rooms WHERE matchmaking = 1 AND status = 'waiting' AND last_seen_at > ?) AS matchmaking,
      (SELECT COUNT(*) FROM rooms WHERE status = 'playing' AND last_seen_at > ?) AS active_games`)
      .bind(now - 45_000, now - 90_000, now - 90_000)
      .first<{ online: number; matchmaking: number; active_games: number }>();
    return NextResponse.json({
      online: Number(counters?.online ?? 0),
      matchmaking: Number(counters?.matchmaking ?? 0),
      activeGames: Number(counters?.active_games ?? 0),
      serverTime: now,
    });
  } catch {
    return NextResponse.json({ error: 'Presença indisponível.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    requireSameOriginJsonMutation(request);
  } catch (error) {
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const user = await getChatGPTUser();
    const body = await request.json() as Record<string, unknown>;
    const visitorId = typeof body.visitorId === 'string' && /^[a-f0-9-]{20,50}$/i.test(body.visitorId) ? body.visitorId : '';
    const sessionId = typeof body.sessionId === 'string' && /^[a-f0-9-]{20,50}$/i.test(body.sessionId) ? body.sessionId : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24) : 'Convidado';
    const roomCode = typeof body.roomCode === 'string' && /^[A-Z2-9]{6}$/.test(body.roomCode) ? body.roomCode : null;
    const requestedMode = typeof body.presenceMode === 'string' ? body.presenceMode : body.mode;
    const mode = typeof requestedMode === 'string' && ALLOWED_MODES.has(requestedMode) ? requestedMode : 'menu';
    if (!visitorId || !sessionId) return NextResponse.json({ error: 'Presença inválida.' }, { status: 400 });
    const now = Date.now();
    const d1 = getD1();
    const safeUserName = user?.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
    await d1.batch([
      d1.prepare(`INSERT INTO player_presence (visitor_id, user_id, display_name, room_code, mode, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(visitor_id) DO UPDATE SET user_id = excluded.user_id, display_name = excluded.display_name, room_code = excluded.room_code, mode = excluded.mode, last_seen_at = excluded.last_seen_at`)
        .bind(visitorId, user?.userId ?? null, safeUserName || displayName || 'Convidado', roomCode, mode, now, now),
      d1.prepare('INSERT OR IGNORE INTO visit_sessions (id, visitor_id, user_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(sessionId, visitorId, user?.userId ?? null, now),
    ]);
    return NextResponse.json({ ok: true, mode, serverTime: now });
  } catch {
    return NextResponse.json({ error: 'Presença indisponível.' }, { status: 500 });
  }
}
