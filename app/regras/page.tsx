import { Ban, Gavel, Handshake, LockKeyhole, MessageCircle, Scale, ShieldCheck, Trophy } from 'lucide-react';
import Link from 'next/link';

const rules = [
  { icon: <Handshake />, title: '1. Respeito entre jogadores', items: ['Trate todos com respeito, inclusive após derrotas.', 'Assédio, discriminação, ameaça, perseguição e exposição de dados pessoais são proibidos.', 'Nomes, emotes e mensagens não podem conter conteúdo ofensivo, sexual, violento ou discriminatório.'] },
  { icon: <Trophy />, title: '2. Fair play competitivo', items: ['Em partidas ranqueadas, cada jogador deve tomar suas próprias decisões.', 'É proibido usar motores externos, automação, assistência de terceiros ou explorar falhas.', 'Manipular Elo, combinar resultados, criar contas para inflar pontuação ou abandonar partidas deliberadamente pode causar perda de Elo e suspensão.'] },
  { icon: <MessageCircle />, title: '3. Chat e comunidade', items: ['Não envie spam, propaganda repetitiva, links maliciosos ou convites enganosos.', 'Convites de sala devem representar partidas reais e respeitar o ritmo anunciado.', 'O chat pode ser registrado para moderação e segurança. Mensagens removidas podem permanecer na trilha de auditoria administrativa.'] },
  { icon: <LockKeyhole />, title: '4. Segurança e privacidade', items: ['Nunca compartilhe senhas, códigos de acesso ou informações financeiras no chat.', 'A equipe não solicitará senha por mensagem.', 'Tentativas de invadir contas, salas, ranking ou painel administrativo podem resultar em banimento permanente e preservação dos registros técnicos.'] },
  { icon: <Scale />, title: '5. Ranking, moedas e cosméticos', items: ['Elo muda apenas após partidas ranqueadas confirmadas e validadas.', 'Moedas e recompensas são vinculadas à conta e não podem ser vendidas ou transferidas fora dos sistemas oficiais.', 'Cosméticos não concedem vantagem no tabuleiro. Explorar falhas para duplicar recompensas leva à reversão e pode gerar punição.'] },
  { icon: <Ban />, title: '6. Punições', items: ['Ações possíveis: aviso, remoção de mensagem, silêncio temporário, perda ou reversão de recompensa irregular, anulação de partida, suspensão e banimento.', 'A duração considera gravidade, reincidência, intenção e impacto.', 'Evasão deliberada de punição pode ampliar a sanção.'] },
  { icon: <Gavel />, title: '7. Administração e recursos', items: ['Ações administrativas sensíveis exigem motivo e ficam registradas.', 'Jogadores podem solicitar revisão por um canal oficial divulgado pela Ekasy-Studio.', 'Erros comprovados serão corrigidos; denúncias falsas e abusivas também podem ser moderadas.'] },
  { icon: <ShieldCheck />, title: '8. Integridade do serviço', items: ['Falhas devem ser reportadas, não exploradas.', 'A Ekasy-Studio pode encerrar salas instáveis, invalidar resultados inconsistentes e atualizar estas regras para proteger a comunidade.', 'As regras vigentes são apresentadas nesta página e podem evoluir junto com o serviço.'] },
];

export default function RulesPage() {
  return (
    <main className="rules-page">
      <header className="support-header"><Link className="brand" href="/"><span className="brand-mark">♘</span><span><strong>NoutyChess.pro</strong><small>Fair play</small></span></Link><Link href="/">Voltar ao jogo</Link></header>
      <section className="rules-hero"><span><ShieldCheck /> CÓDIGO DA ARENA</span><h1>Regras da comunidade NoutyChess.pro</h1><p>Competição forte, aprendizado constante e respeito absoluto. Estas regras existem para manter cada partida justa, segura e divertida.</p><small>Versão 1.1 · 2 de setembro de 2026</small></section>
      <section className="rules-grid">{rules.map((rule) => <article key={rule.title}><span>{rule.icon}</span><h2>{rule.title}</h2><ul>{rule.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</section>
      <section className="rules-summary"><ShieldCheck /><div><h2>Regra de ouro</h2><p>Jogue com sua própria habilidade, trate pessoas como rivais, nunca como inimigas, e ajude a proteger a arena que todos queremos frequentar.</p><div className="legal-links"><Link href="/termos">Termos e direitos</Link><Link href="/privacidade">Privacidade</Link></div></div></section>
      <footer className="studio-credit"><strong>© 2026 Ekasy-Studio</strong><span>NoutyChess.pro · Todos os direitos reservados.</span></footer>
    </main>
  );
}