'use client';

import { Crown, Gamepad2, Gem, Gift, LogIn, MessageCircle, Palette, ShieldCheck, Sparkles, Star, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function ClubExperience({ membership, signInPath }: { membership: { active: boolean; until: number | null; name: string } | null; signInPath: string }) {
  const [interested, setInterested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reserve = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/membership', { method: 'POST' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível reservar.');
      setInterested(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível reservar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="club-shell">
      <header className="simple-page-header"><Link className="brand" href="/"><span className="brand-mark">♘</span><span><strong>NoutyChess.pro</strong><small>Jogue melhor</small></span></Link><Link href="/">Voltar ao jogo</Link></header>
      <section className="club-hero">
        <div className="club-orbit"><i /><span><Crown /></span></div>
        <div><span className="club-kicker"><Sparkles /> CLUBE LENDÁRIO</span><h1>Não é só jogar.<br />É deixar sua assinatura.</h1><p>Uma experiência de membro feita para quem quer pertencer à história do NoutyChess.pro, sem comprar vantagem no ranking.</p>
          {membership?.active ? <div className="member-active"><ShieldCheck /><span><strong>{membership.name}, seu Clube está ativo.</strong><small>Vá ao perfil e equipe Aurora e Prisma agora.</small></span></div> : membership ? <Button className="club-cta" onClick={() => void reserve()} disabled={busy || interested}>{interested ? <><Star /> Acesso de fundador reservado</> : <><Crown /> Quero ser membro fundador</>}</Button> : <a className="club-cta club-cta-link" href={signInPath} target="_top"><LogIn /> Entrar e reservar acesso</a>}
          {error && <div className="network-error">{error}</div>}
          <small className="club-honesty">A abertura comercial está em preparação. Reservar não gera cobrança.</small>
        </div>
      </section>

      <section className="club-benefits">
        <article className="benefit-featured"><div className="aurora-preview"><span>♛</span><span>♞</span><span>♚</span></div><small>IDENTIDADE RARA</small><h2>Tabuleiro Aurora + peças Prisma</h2><p>Um conjunto vivo, luminoso e imediatamente reconhecível em cada partida.</p></article>
        <article><Palette /><h3>Moldura viva</h3><p>Perfil com brilho lendário e selo de membro em todos os espaços sociais.</p></article>
        <article><MessageCircle /><h3>Emotes raros</h3><p>Reações exclusivas e elegantes para comemorar sem quebrar o fair play.</p></article>
        <article><UsersRound /><h3>Eventos privados</h3><p>Arenas temáticas, desafios da comunidade e encontros com os professores.</p></article>
        <article><Gift /><h3>Relíquia mensal</h3><p>Uma peça cosmética sazonal para construir uma coleção com história.</p></article>
        <article><Gamepad2 /><h3>Sala de destaque</h3><p>Convites com cartão especial e lobby personalizado para sua turma.</p></article>
        <article><Gem /><h3>Legado fundador</h3><p>Quem chegar primeiro conserva uma insígnia que nunca voltará à loja.</p></article>
      </section>

      <section className="fair-play-promise"><ShieldCheck /><div><small>PROMESSA NO PAY-TO-WIN</small><h2>Seu Elo continua pertencendo ao seu talento.</h2><p>O Clube melhora identidade, coleção e comunidade. Não altera lances, tempo, pareamento, IA competitiva ou pontuação.</p></div></section>
      <footer className="simple-page-footer">Feito pela <strong>Ekasy-Studio</strong>, fundada por Thiago Roger.</footer>
    </main>
  );
}
