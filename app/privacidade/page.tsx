import type { Metadata } from 'next';
import { Database, Eye, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'Como o NoutyChess utiliza dados necessários para contas, partidas e segurança.',
};

const sections = [
  { icon: <UserRoundCheck />, title: 'Conta e perfil', text: 'Quando você entra com uma conta compatível, o jogo utiliza o identificador autenticado e dados básicos necessários para associar seu perfil competitivo, Elo, amigos, benefícios e histórico.' },
  { icon: <Database />, title: 'Dados do jogo', text: 'Podemos armazenar informações necessárias para operar partidas e recursos sociais, como perfil público, resultados, ranking, moedas virtuais, amigos, convites, moderação, presença recente e configurações persistentes.' },
  { icon: <Eye />, title: 'Presença e moderação', text: 'Sinais recentes de presença podem ser usados para indicar quem está online, pareamento, convites e administração. Mensagens de chat podem ser registradas para moderação, prevenção de abuso e auditoria.' },
  { icon: <LockKeyhole />, title: 'Segurança', text: 'Credenciais e segredos administrativos não devem ser enviados ao navegador. O painel administrativo exige autenticação e autorização no servidor. O projeto evita armazenar senhas próprias quando a autenticação é fornecida pela plataforma.' },
  { icon: <ShieldCheck />, title: 'Uso responsável', text: 'Os dados do jogo devem ser utilizados para operação, segurança, suporte, progressão, recursos sociais e melhoria do serviço. Informações sensíveis não devem ser publicadas em chat ou nome de perfil.' },
];

export default function PrivacyPage() {
  return (
    <main className="rules-page">
      <header className="support-header"><Link className="brand" href="/"><span className="brand-mark">♘</span><span><strong>NoutyChess</strong><small>Privacidade</small></span></Link><Link href="/">Voltar ao jogo</Link></header>
      <section className="rules-hero"><span><ShieldCheck /> PRIVACIDADE</span><h1>Dados somente quando ajudam o jogo a funcionar.</h1><p>Transparência sobre as informações usadas para contas, competição, comunidade e segurança.</p><small>Versão 1.0 · setembro de 2026</small></section>
      <section className="rules-grid">{sections.map((section) => <article key={section.title}><span>{section.icon}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</section>
      <section className="rules-summary"><LockKeyhole /><div><h2>Não compartilhe credenciais</h2><p>Nunca envie senha, token, código de autenticação ou informação financeira pelo chat da comunidade.</p></div></section>
      <footer className="studio-credit"><strong>© 2026 Ekasy Studio</strong><span>NoutyChess</span></footer>
    </main>
  );
}
