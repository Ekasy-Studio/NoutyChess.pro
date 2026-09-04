import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  closeRoom,
  findAutomaticMatch,
  getOrCreateProfile,
  heartbeatRoom,
  listLeaderboard,
  purchaseCosmetic,
  submitMatchReport,
  updatePublicProfile,
  type ColorCode,
  type MatchResult,
} from '@/lib/competitive';
import { RequestSecurityError, requireSameOriginJsonMutation } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getChatGPTUser();
    const [profile, leaderboard] = await Promise.all([
      user ? getOrCreateProfile(user) : null,
      listLeaderboard(10),
    ]);
    return NextResponse.json({ authenticated: Boolean(user), profile, leaderboard });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar o ranking.' }, { status: 500 });
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
  if (!user) return NextResponse.json({ error: 'Entre com sua conta para jogar partidas ranqueadas.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  try {
    if (body.action === 'heartbeat') {
      const code = typeof body.roomCode === 'string' ? body.roomCode.toUpperCase() : '';
      const role = body.role === 'host' || body.role === 'guest' ? body.role : null;
      if (!/^[A-Z2-9]{6}$/.test(code) || !role) throw new Error('Sala inválida.');
      await heartbeatRoom(user, code, role, body.matchmaking === true);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'find-match') {
      const currentRoomCode = typeof body.currentRoomCode === 'string' ? body.currentRoomCode.toUpperCase() : '';
      if (currentRoomCode && !/^[A-Z2-9]{6}$/.test(currentRoomCode)) throw new Error('Sala de busca inválida.');
      const match = await findAutomaticMatch(user, currentRoomCode || undefined);
      return NextResponse.json({ ok: true, match });
    }

    if (body.action === 'update-profile') {
      const displayName = typeof body.displayName === 'string' ? body.displayName : '';
      const avatarEmote = typeof body.avatarEmote === 'string' ? body.avatarEmote : '';
      const profileTitle = typeof body.profileTitle === 'string' ? body.profileTitle : '';
      const boardTheme = typeof body.boardTheme === 'string' ? body.boardTheme : 'emerald';
      const pieceTheme = typeof body.pieceTheme === 'string' ? body.pieceTheme : 'classic';
      const profile = await updatePublicProfile(user, { displayName, avatarEmote, profileTitle, boardTheme, pieceTheme });
      return NextResponse.json({ ok: true, profile });
    }

    if (body.action === 'purchase-cosmetic') {
      const cosmeticCode = typeof body.cosmeticCode === 'string' ? body.cosmeticCode : '';
      const profile = await purchaseCosmetic(user, cosmeticCode);
      return NextResponse.json({ ok: true, profile });
    }

    if (body.action === 'close-room') {
      const code = typeof body.roomCode === 'string' ? body.roomCode.toUpperCase() : '';
      if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error('Sala inválida.');
      await closeRoom(user.userId, code);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'report-match') {
      const roomCode = typeof body.roomCode === 'string' ? body.roomCode.toUpperCase() : '';
      const color: ColorCode | null = body.color === 'w' || body.color === 'b' ? body.color : null;
      const result: MatchResult | null = body.result === '1-0' || body.result === '0-1' || body.result === '1/2-1/2' ? body.result : null;
      const pgn = typeof body.pgn === 'string' ? body.pgn : '';
      if (!/^[A-Z2-9]{6}$/.test(roomCode) || !color || !result) throw new Error('Relatório inválido.');
      const response = await submitMatchReport(user, { roomCode, color, result, pgn });
      return NextResponse.json({ ok: true, ...response });
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a ação.';
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 400 });
  }
}
