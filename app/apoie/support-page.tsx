'use client';

import { Check, Copy, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let copied = false;
  try {
    // Fallback only for browsers where the modern Clipboard API is unavailable.
    // oxlint-disable-next-line typescript/no-deprecated
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

export function SupportPage({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const copy = async () => {
    if (!pixKey) return;
    setCopied(false);
    setCopyError('');

    let success = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(pixKey);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) success = legacyCopy(pixKey);

    if (!success) {
      setCopyError('Não foi possível copiar automaticamente. Toque e segure a chave para copiá-la.');
      return;
    }

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
              <small>Chave Pix</small>
              <strong>{pixKey}</strong>
              <Button onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? 'Chave copiada' : 'Copiar chave Pix'}</Button>
              {copyError && <p className="network-error" role="alert">{copyError}</p>}
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