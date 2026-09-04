import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';
import { RequestSecurityError, requireSameOriginJsonMutation } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ authenticated: false, notifications: [], unread: 0 });
  try {
    await ensureSchema();
    const d1 = getD1();
    const [notifications, unread] = await Promise.all([
      d1.prepare(`SELECT id, kind, title, message, payload, created_at, read_at
        FROM user_notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 30`).bind(user.userId).all(),
      d1.prepare('SELECT COUNT(*) AS count FROM user_notifications WHERE user_id = ? AND read_at IS NULL')
        .bind(user.userId).first<{ count: number }>(),
    ]);
    return NextResponse.json({ authenticated: true, notifications: notifications.results, unread: Number(unread?.count ?? 0) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar suas notificações.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    requireSameOriginJsonMutation(request);
  } catch (error) {
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Entre para gerenciar suas notificações.' }, { status: 401 });
  try {
    await ensureSchema();
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const d1 = getD1();
    const now = Date.now();

    if (action === 'read-all') {
      await d1.prepare('UPDATE user_notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(now, user.userId).run();
      return NextResponse.json({ ok: true });
    }

    if (action === 'read') {
      const id = typeof body.id === 'string' ? body.id.slice(0, 100) : '';
      if (!id) return NextResponse.json({ error: 'Notificação inválida.' }, { status: 400 });
      await d1.prepare('UPDATE user_notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL').bind(now, id, user.userId).run();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar suas notificações.' }, { status: 500 });
  }
}
