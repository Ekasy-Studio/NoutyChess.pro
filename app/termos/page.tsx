import type { Metadata } from 'next';
import { Copyright, Scale, ShieldCheck, Swords, UserRoundCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos e direitos',
  description: 'Termos de uso, fair play e propriedade intelectual do NoutyChess.',
};

const sections = [
  {
    icon: <UserRoundCheck />,
    title: 'Uso da plataforma',
    text: 'O NoutyChess é uma plataforma independente de xadrez, comunidade e aprendizado. Ao utilizar o serviço, o jogador concorda em respeitar as regras da comunidade, a integridade das partidas e os demais usuários.',
  },
  {
    icon: <Swords />,
    title: 'Competição e fair play',
    text: 'Partidas competitivas devem refletir a habilidade do próprio jogador. É proibido usar engines, automação, assistência externa, exploração de falhas ou combinação de resultados em partidas ranqueadas.',
  },
  {
    icon: <Copyright />,
    title: 'Direitos autorais e propriedade',
    text: '© 2026 Ekasy Studio. NoutyChess, seu código-fonte próprio, identidade visual, interfaces, sistemas originais, textos, materiais educacionais e ativos produzidos pela Ekasy Studio são de uso proprietário, salvo quando indicado de outra forma. Bibliotecas de terceiros permanecem sob suas respectivas licenças.',
  },
  {
    icon: <ShieldCheck />,
    title: 'Segurança e integridade',
    text: 'Não é permitido tentar obter acesso não autorizado a contas, banco de dados, painel administrativo, infraestrutura, código privado ou sistemas internos. Falhas devem ser reportadas de boa-fé, e não exploradas.',
  },
  {
    icon: <Scale />,
    title: 'Atualizações e disponibilidade',
    text: 'O jogo pode receber atualizações de segurança, experiência, recursos sociais, cosméticos e regras. Recursos podem ser ajustados quando necessário para proteger jogadores, infraestrutura e competição justa.',
  },
];

export default function TermsPage() {
  return (
    <main className="rules-page">
      <header className="support-header">
        <Link className="brand" href="/"><span className="brand-mark">♘</span><span><strong>NoutyChess</strong><small>Ekasy Studio</small></span></Link>
        <Link href="/">Voltar ao jogo</Link>
      </header>
      <section className="rules-hero">
        <span><Scale /> TERMOS E DIREITOS</span>
        <h1>Uma arena competitiva, independente e protegida.</h1>
        <p>Regras claras para manter o NoutyChess seguro, justo e sustentável para toda a comunidade.</p>
        <small>Versão 1.0 · setembro de 2026</small>
      </section>
      <section className="rules-grid">
        {sections.map((section) => <article key={section.title}><span>{section.icon}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}
      </section>
      <section className="rules-summary">
        <Copyright />
        <div><h2>Produto independente</h2><p>NoutyChess é desenvolvido pela Ekasy Studio. O acesso ao jogo não concede licença para copiar, distribuir ou comercializar o código-fonte ou materiais proprietários do projeto.</p></div>
      </section>
      <footer className="studio-credit"><strong>© 2026 Ekasy Studio</strong><span>Todos os direitos reservados.</span></footer>
    </main>
  );
}
