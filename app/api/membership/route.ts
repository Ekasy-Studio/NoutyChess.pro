import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';
import { getOrCreateProfile } from '@/lib/competitive';
import { RequestSecurityError, requireSameOriginJsonMutation } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ authenticated: false, interested: false, active: false });
  try {
    await ensureSchema();
    const profile = await getOrCreateProfile(user);
    const interest = await getD1().prepare('SELECT status, created_at, updated_at FROM membership_interest WHERE user_id = ?').bind(user.userId).first<{ status: string; created_at: number; updated_at: number }>();
    const active = profile.membershipTier === 'legend' && Boolean(profile.memberUntil && profile.memberUntil > Date.now());
    return NextResponse.json({
      authenticated: true,
      interested: interest?.status === 'interested',
      status: interest?.status ?? null,
      active,
      membershipTier: active ? 'legend' : 'free',
      memberUntil: profile.memberUntil,
      requestedAt: interest?.created_at ?? null,
      updatedAt: interest?.updated_at ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar o Clube.' }, { status: 500 });
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
  if (!user) return NextResponse.json({ error: 'Entre para solicitar acesso ao Clube.' }, { status: 401 });
  try {
    await ensureSchema();
    const profile = await getOrCreateProfile(user);
    const now = Date.now();
    if (profile.bannedUntil && profile.bannedUntil > now) {
      return NextResponse.json({ error: 'Contas suspensas não podem solicitar acesso ao Clube.' }, { status: 403 });
    }

    const active = profile.membershipTier === 'legend' && Boolean(profile.memberUntil && profile.memberUntil > now);
    if (active) return NextResponse.json({ ok: true, active: true, status: 'activated', memberUntil: profile.memberUntil });

    const d1 = getD1();
    const current = await d1.prepare('SELECT status, created_at, updated_at FROM membership_interest WHERE user_id = ?')
      .bind(user.userId).first<{ status: string; created_at: number; updated_at: number }>();

    if (current?.status === 'interested') {
      return NextResponse.json({ ok: true, interested: true, status: current.status, requestedAt: current.created_at, updatedAt: current.updated_at });
    }
    if (current?.status === 'declined' && now - current.updated_at < 24 * 60 * 60_000) {
      return NextResponse.json({
        error: 'Sua solicitação foi analisada recentemente. Você poderá solicitar novamente mais tarde.',
        retryAfter: current.updated_at + 24 * 60 * 60_000,
      }, { status: 429 });
    }

    await d1.prepare(`INSERT INTO membership_interest (user_id, status, created_at, updated_at) VALUES (?, 'interested', ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET status = 'interested', updated_at = excluded.updated_at`)
      .bind(user.userId, now, now).run();
    const persisted = await d1.prepare('SELECT status, created_at, updated_at FROM membership_interest WHERE user_id = ?').bind(user.userId).first<{ status: string; created_at: number; updated_at: number }>();
    if (!persisted || persisted.status !== 'interested') return NextResponse.json({ error: 'Não foi possível confirmar sua solicitação.' }, { status: 500 });
    return NextResponse.json({ ok: true, interested: true, status: persisted.status, requestedAt: persisted.created_at, updatedAt: persisted.updated_at });
  } catch {
    return NextResponse.json({ error: 'Não foi possível solicitar seu acesso.' }, { status: 500 });
  }
}
