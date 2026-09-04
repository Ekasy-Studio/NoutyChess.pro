import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';
import { getOrCreateProfile } from '@/lib/competitive';
import { chatSafetyReason } from '@/lib/chat-safety';
import { RequestSecurityError, requireSameOriginJsonMutation } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    const result = await getD1().prepare(
      "SELECT id, user_id, display_name, avatar_emote, message, room_code, created_at FROM community_messages WHERE deleted_at IS NULL AND scope = 'community' ORDER BY created_at DESC LIMIT 50",
    ).all();
    return NextResponse.json({ messages: (result.results ?? []).reverse() });
  } catch {
    return NextResponse.json({ error: 'O chat da comunidade está temporariamente indisponível.' }, { status: 500 });
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
  if (!user) return NextResponse.json({ error: 'Entre com sua conta para conversar.' }, { status: 401 });
  try {
    const profile = await getOrCreateProfile(user);
    const now = Date.now();
    if (profile.bannedUntil && profile.bannedUntil > now) return NextResponse.json({ error: 'Sua conta está suspensa.' }, { status: 403 });
    if (profile.chatMutedUntil && profile.chatMutedUntil > now) return NextResponse.json({ error: `Chat silenciado: ${profile.chatMuteReason ?? 'violação das regras'}.` }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const message = typeof body.message === 'string' ? body.message.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 280) : '';
    const roomCode = typeof body.roomCode === 'string' && /^[A-Z2-9]{6}$/.test(body.roomCode.toUpperCase()) ? body.roomCode.toUpperCase() : null;
    const scope = body.scope === 'room' ? 'room' : 'community';
    if (!message) return NextResponse.json({ error: 'Escreva uma mensagem.' }, { status: 400 });
    const safetyReason = chatSafetyReason(message);
    if (safetyReason) return NextResponse.json({ error: safetyReason }, { status: 400 });
    if (scope === 'room' && !roomCode) return NextResponse.json({ error: 'Sala inválida.' }, { status: 400 });
    const d1 = getD1();
    if (roomCode) {
      const room = await d1.prepare("SELECT host_id, guest_id FROM rooms WHERE code = ? AND status IN ('waiting', 'playing') AND last_seen_at > ?")
        .bind(roomCode, now - 90_000).first<{ host_id: string; guest_id: string | null }>();
      if (!room) return NextResponse.json({ error: 'O convite precisa apontar para uma sala ativa.' }, { status: 400 });
      if (scope === 'room' && room.host_id !== user.userId && room.guest_id !== user.userId) {
        return NextResponse.json({ error: 'Você não participa desta sala.' }, { status: 403 });
      }
    }
    const recent = await d1.prepare('SELECT created_at FROM community_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(user.userId).first<{ created_at: number }>();
    if (recent && now - recent.created_at < 3_000) return NextResponse.json({ error: 'Aguarde alguns segundos antes de enviar outra mensagem.' }, { status: 429 });
    await d1.prepare('INSERT INTO community_messages (user_id, display_name, avatar_emote, message, room_code, scope, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(user.userId, profile.displayName, profile.avatarEmote, message, roomCode, scope, now).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível enviar a mensagem.' }, { status: 400 });
  }
}
