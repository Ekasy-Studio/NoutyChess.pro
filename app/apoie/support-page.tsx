'use client';

import { Check, Copy, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function SupportPage({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!pixKey) return;
    await navigator.clipboard.writeText(pixKey).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <main className="support-page">
      <header className="support-header">
        <Link className="brand" href="/"><span className="brand-mark">♘</span><span><strong>NoutyChess.pro</strong><small>Ekasy-Studio</small></span></Link>
        <Link href="/">Voltar ao tabuleiro</Link>
      </header>
      <section className="support-hero">
        <div className="support-copy">
          <span className="eyebrow"><Heart /> Apoie um jogo independente</span>
          <h1>Ajude a tornar o NoutyChess.pro ainda mais lendário.</h1>
          <p>Seu apoio ajuda a Ekasy-Studio a manter servidores, evoluir a inteligência dos professores, criar novas temporadas e produzir cosméticos com cada vez mais qualidade.</p>
          <div className="support-values">
            <span><Sparkles /> Evolução contínua</span><span><ShieldCheck /> Competição justa</span><span><Heart /> Estúdio independente</span>
          </div>
        </div>
        <aside className="pix-card">
          <span>APOIO VIA PIX</span>
          <div className="pix-mark">PIX</div>
          {pixKey ? (
            <>
              <small>Chave aleatória</small>
              <strong>{pixKey}</strong>
              <Button onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? 'Chave copiada' : 'Copiar chave Pix'}</Button>
            </>
          ) : (
            <div className="pix-coming-soon"><strong>Em breve</strong><p>A chave Pix será disponibilizada pelo estúdio.</p></div>
          )}
          <p className="pix-note">O apoio é voluntário e não concede vantagem competitiva.</p>
        </aside>
      </section>
      <footer className="studio-credit"><strong>Ekasy-Studio</strong><span>Fundada por Thiago Roger</span></footer>
    </main>
  );
}
