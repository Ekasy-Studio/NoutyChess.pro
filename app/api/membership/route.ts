import { NextResponse } from 'next/server';

import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';
import { getOrCreateProfile } from '@/lib/competitive';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ authenticated: false, interested: false });
  try {
    await ensureSchema();
    const profile = await getOrCreateProfile(user);
    const interest = await getD1().prepare('SELECT status FROM membership_interest WHERE user_id = ?').bind(user.userId).first<{ status: string }>();
    return NextResponse.json({ authenticated: true, interested: Boolean(interest), status: interest?.status ?? null, membershipTier: profile.membershipTier, memberUntil: profile.memberUntil });
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar o Clube.' }, { status: 500 });
  }
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: 'Entre para reservar seu acesso de fundador.' }, { status: 401 });
  try {
    await ensureSchema();
    await getOrCreateProfile(user);
    const now = Date.now();
    await getD1().prepare(`INSERT INTO membership_interest (user_id, status, created_at, updated_at) VALUES (?, 'interested', ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET status = CASE WHEN membership_interest.status = 'activated' THEN 'activated' ELSE 'interested' END, updated_at = excluded.updated_at`)
      .bind(user.userId, now, now).run();
    return NextResponse.json({ ok: true, interested: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível reservar seu acesso.' }, { status: 500 });
  }
}
