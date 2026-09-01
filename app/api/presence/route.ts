import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const user = await getChatGPTUser();
    const body = await request.json() as Record<string, unknown>;
    const visitorId = typeof body.visitorId === 'string' && /^[a-f0-9-]{20,50}$/i.test(body.visitorId) ? body.visitorId : '';
    const sessionId = typeof body.sessionId === 'string' && /^[a-f0-9-]{20,50}$/i.test(body.sessionId) ? body.sessionId : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24) : 'Convidado';
    const roomCode = typeof body.roomCode === 'string' && /^[A-Z2-9]{6}$/.test(body.roomCode) ? body.roomCode : null;
    const allowedModes = new Set(['menu', 'computer', 'local', 'online']);
    const mode = typeof body.mode === 'string' && allowedModes.has(body.mode) ? body.mode : 'menu';
    if (!visitorId || !sessionId) return NextResponse.json({ error: 'Presença inválida.' }, { status: 400 });
    const now = Date.now();
    const d1 = getD1();
    await d1.batch([
      d1.prepare(`INSERT INTO player_presence (visitor_id, user_id, display_name, room_code, mode, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(visitor_id) DO UPDATE SET user_id = excluded.user_id, display_name = excluded.display_name, room_code = excluded.room_code, mode = excluded.mode, last_seen_at = excluded.last_seen_at`)
        .bind(visitorId, user?.userId ?? null, (user?.displayName ?? displayName) || 'Convidado', roomCode, mode, now, now),
      d1.prepare('INSERT OR IGNORE INTO visit_sessions (id, visitor_id, user_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(sessionId, visitorId, user?.userId ?? null, now),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Presença indisponível.' }, { status: 500 });
  }
}
