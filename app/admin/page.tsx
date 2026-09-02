import type { Metadata } from 'next';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { AdminAccessError, requireAdmin } from '@/lib/admin-auth';
import { AdminDashboard } from './admin-dashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Área restrita | NoutyChess.pro',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (!user) {
    return (
      <main className="admin-access-page">
        <div className="admin-access-card">
          <ShieldCheck />
          <h1>Área restrita</h1>
          <p>Entre com uma conta administrativa autorizada.</p>
          <a href={chatGPTSignInPath('/admin')} target="_top">Entrar</a>
          <Link className="admin-back" href="/">Voltar ao jogo</Link>
        </div>
      </main>
    );
  }

  try {
    await requireAdmin();
  } catch (error) {
    const message = error instanceof AdminAccessError ? error.message : 'Acesso administrativo indisponível.';
    return (
      <main className="admin-access-page">
        <div className="admin-access-card admin-access-denied">
          <ShieldAlert />
          <h1>Acesso não autorizado</h1>
          <p>{message}</p>
          <Link className="admin-back" href="/">Voltar ao jogo</Link>
        </div>
      </main>
    );
  }

  return <AdminDashboard adminName={user.displayName} />;
}