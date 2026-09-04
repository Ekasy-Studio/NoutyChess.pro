export type TeachingLevel = 'beginner' | 'intermediate' | 'advanced';
export type TeacherId = 'niclaus' | 'damon';

export type OpeningLesson = {
  eco: string;
  name: string;
  moves: string[];
  ideas: string[];
  whitePlans: string[];
  blackPlans: string[];
  commonMistakes: string[];
  level: TeachingLevel;
};

export type ChessConcept = {
  id: string;
  title: string;
  category: 'rules' | 'fundamentals' | 'tactics' | 'strategy' | 'endgames';
  beginner: string;
  intermediate: string;
  advanced: string;
  keywords: string[];
};

export const TEACHERS: Record<TeacherId, {
  name: string;
  identity: string;
  method: string[];
  tone: string;
}> = {
  niclaus: {
    name: 'Niclaus',
    identity: 'Professor técnico, paciente e estratégico. Ensina primeiro o princípio, depois a exceção.',
    method: ['Faça o aluno observar antes de entregar a resposta.', 'Explique causa e consequência.', 'Priorize centro, desenvolvimento, segurança do rei, atividade e finais.'],
    tone: 'Calmo, preciso, respeitoso e didático.',
  },
  damon: {
    name: 'Damon',
    identity: 'Professor direto, provocador e tático. Ensina procurando iniciativa, ameaças e oportunidades.',
    method: ['Faça perguntas curtas que puxem o raciocínio.', 'Destaque lances forçados e peças vulneráveis.', 'Use humor leve sem humilhar o aluno.'],
    tone: 'Confiante, energético, espirituoso e objetivo.',
  },
};

export const OPENING_LIBRARY: OpeningLesson[] = [
  { eco: 'C50', name: 'Abertura Italiana', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], ideas: ['Desenvolvimento rápido', 'Pressão em f7', 'Roque cedo'], whitePlans: ['c3 e d4 para conquistar o centro', 'Re1 e desenvolvimento harmonioso'], blackPlans: ['Nf6, Bc5 e roque', 'Atacar o centro branco no momento certo'], commonMistakes: ['Atacar f7 com peças demais cedo', 'Mover a dama repetidamente na abertura'], level: 'beginner' },
  { eco: 'C60', name: 'Abertura Espanhola', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], ideas: ['Pressão sobre o defensor de e5', 'Desenvolvimento com tensão central', 'Jogo estratégico de longo prazo'], whitePlans: ['Roque, Re1, c3 e d4', 'Manter pressão sem precipitar trocas'], blackPlans: ['a6 e b5 quando apropriado', 'Nf6, Be7 e roque'], commonMistakes: ['Capturar em c6 sem entender a estrutura', 'Defender e5 passivamente demais'], level: 'intermediate' },
  { eco: 'C44', name: 'Abertura Escocesa', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], ideas: ['Abrir o centro cedo', 'Desenvolvimento ativo', 'Linhas claras para peças'], whitePlans: ['Recuperar o centro com desenvolvimento', 'Usar colunas abertas'], blackPlans: ['Trocar no centro e desenvolver com tempo', 'Pressionar e4'], commonMistakes: ['Recapturar com a peça errada', 'Negligenciar desenvolvimento após abrir o centro'], level: 'beginner' },
  { eco: 'C25', name: 'Abertura Vienense', moves: ['e4', 'e5', 'Nc3'], ideas: ['Flexibilidade', 'Possibilidade de f4', 'Desenvolvimento sem revelar o cavalo g1 cedo'], whitePlans: ['f4 em linhas agressivas', 'Nf3 e Bc4 em linhas sólidas'], blackPlans: ['Nf6 e desenvolvimento central', 'Contra-atacar e4'], commonMistakes: ['Empurrar f4 sem calcular e5/f4', 'Atrasar segurança do rei'], level: 'intermediate' },
  { eco: 'D06', name: 'Gambito da Dama', moves: ['d4', 'd5', 'c4'], ideas: ['Pressionar o centro preto', 'Ganhar espaço', 'Desenvolvimento natural'], whitePlans: ['Nc3, Nf3, e3 e desenvolvimento do bispo', 'Pressão na coluna c'], blackPlans: ['e6 ou c6 para sustentar d5', 'Desenvolver sem tentar segurar o peão a qualquer custo'], commonMistakes: ['Confundir gambito com sacrifício obrigatório', 'Tentar defender c4 por muito tempo'], level: 'beginner' },
  { eco: 'D02', name: 'Sistema Londres', moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'], ideas: ['Estrutura sólida', 'Desenvolvimento simples', 'Plano repetível'], whitePlans: ['e3, Bd3, Nbd2, c3 e roque', 'Ne5 e ataque no rei quando houver condições'], blackPlans: ['c5 e pressão no centro', 'Qb6 em algumas posições'], commonMistakes: ['Jogar automaticamente sem observar o adversário', 'Bloquear o bispo c1 cedo'], level: 'beginner' },
  { eco: 'E00', name: 'Abertura Catalã', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'], ideas: ['Fianchetto do bispo', 'Pressão de longo alcance', 'Centro sólido'], whitePlans: ['Bg2, Nf3 e roque', 'Recuperar ou explorar o peão c4 em linhas abertas'], blackPlans: ['d5 ou Bb4+', 'Lutar contra a pressão na diagonal longa'], commonMistakes: ['Subestimar a diagonal g2-a8', 'Recuperar material cedo sem desenvolvimento'], level: 'advanced' },
  { eco: 'B20', name: 'Defesa Siciliana', moves: ['e4', 'c5'], ideas: ['Assimetria imediata', 'Contrajogo no flanco da dama', 'Luta por d4'], whitePlans: ['Nf3 e d4 nas linhas abertas', 'Ataque no rei em muitas variantes'], blackPlans: ['Nc6/d6/e6 conforme variante', 'Pressão na coluna c'], commonMistakes: ['Copiar planos de e5 como se a estrutura fosse simétrica', 'Atacar sem desenvolver'], level: 'intermediate' },
  { eco: 'C00', name: 'Defesa Francesa', moves: ['e4', 'e6', 'd4', 'd5'], ideas: ['Atacar o centro branco', 'Estrutura fechada ou tensão central', 'Contrajogo com c5'], whitePlans: ['e5 em linhas de avanço', 'Atacar o rei e explorar espaço'], blackPlans: ['c5 e f6 para atacar a cadeia', 'Resolver o bispo de c8'], commonMistakes: ['Deixar o bispo c8 sem plano', 'Atacar a base errada da cadeia de peões'], level: 'intermediate' },
  { eco: 'B10', name: 'Defesa Caro-Kann', moves: ['e4', 'c6', 'd4', 'd5'], ideas: ['Centro sólido', 'Desenvolver o bispo antes de e6', 'Final saudável'], whitePlans: ['Usar espaço e desenvolvimento', 'Pressionar antes da estrutura preta se estabilizar'], blackPlans: ['Bf5/Bg4 e e6', 'Atacar o centro com c5'], commonMistakes: ['Jogar passivamente demais', 'Trocar todas as peças sem objetivo'], level: 'beginner' },
  { eco: 'B07', name: 'Defesa Pirc', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'], ideas: ['Permitir centro branco para atacá-lo depois', 'Fianchetto', 'Contrajogo dinâmico'], whitePlans: ['Construir centro e desenvolver', 'Ataque austríaco com f4 em algumas linhas'], blackPlans: ['Bg7, roque e e5/c5', 'Atacar o centro na hora certa'], commonMistakes: ['Deixar o branco avançar sem contragolpe', 'Abrir o rei cedo demais'], level: 'advanced' },
  { eco: 'B02', name: 'Defesa Alekhine', moves: ['e4', 'Nf6'], ideas: ['Provocar avanço dos peões', 'Atacar o centro estendido', 'Jogo hipermoderno'], whitePlans: ['Ganhar espaço sem exagerar', 'Desenvolver atrás da cadeia'], blackPlans: ['d6 e ataque aos peões centrais', 'Desenvolver com precisão'], commonMistakes: ['Mover o cavalo demais sem compensação', 'Brancas avançarem peões sem desenvolver'], level: 'advanced' },
  { eco: 'E60', name: 'Defesa Índia do Rei', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'], ideas: ['Centro flexível', 'Ataque no rei em estruturas fechadas', 'Contrajogo assimétrico'], whitePlans: ['e4 e expansão no flanco da dama', 'Usar espaço central'], blackPlans: ['d6, roque, e5', 'f5 e ataque no flanco do rei em estruturas fechadas'], commonMistakes: ['Atacar no flanco errado', 'Fechar o centro sem entender os planos'], level: 'advanced' },
  { eco: 'E20', name: 'Defesa Nimzo-Índia', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], ideas: ['Pressão em c3/e4', 'Controle de casas', 'Estruturas variadas'], whitePlans: ['Desenvolver e decidir estrutura de peões', 'Usar par de bispos quando obtido'], blackPlans: ['Dobrar peões em c3 quando compensar', 'Pressão central'], commonMistakes: ['Trocar em c3 automaticamente', 'Ignorar desenvolvimento para caçar peões'], level: 'advanced' },
  { eco: 'D10', name: 'Defesa Eslava', moves: ['d4', 'd5', 'c4', 'c6'], ideas: ['Sustentar d5 sem bloquear o bispo c8', 'Estrutura sólida', 'Contrajogo no centro'], whitePlans: ['Nc3/Nf3 e pressão central', 'Desenvolvimento ativo'], blackPlans: ['Nf6, Bf5 e e6', 'dxc4 quando fizer sentido'], commonMistakes: ['Segurar peão extra sacrificando desenvolvimento', 'Passividade excessiva'], level: 'intermediate' },
  { eco: 'A80', name: 'Defesa Holandesa', moves: ['d4', 'f5'], ideas: ['Controle de e4', 'Ataque no flanco do rei', 'Estrutura assimétrica'], whitePlans: ['g3/Bg2 e pressão no centro', 'Explorar casas enfraquecidas'], blackPlans: ['Nf6, g6/e6 conforme sistema', 'Ataque coordenado no rei'], commonMistakes: ['Enfraquecer o rei sem desenvolvimento', 'Atacar antes de concluir mobilização'], level: 'advanced' },
];

export const CONCEPTS: ChessConcept[] = [
  { id: 'piece-moves', title: 'Movimento das peças', category: 'rules', beginner: 'Cada peça tem um padrão próprio. Antes de procurar tática, confirme quais casas ela realmente pode alcançar.', intermediate: 'Além do movimento, observe casas controladas e peças que bloqueiam linhas.', advanced: 'Mobilidade vale pelo efeito na posição, não apenas pelo número de casas disponíveis.', keywords: ['movimento', 'peca', 'peça', 'como move', 'como jogar'] },
  { id: 'castling', title: 'Roque', category: 'rules', beginner: 'O roque move rei e torre juntos. Rei e torre não podem ter se movido, não pode haver peça entre eles e o rei não pode atravessar uma casa atacada.', intermediate: 'Roque é uma ferramenta de segurança e conexão das torres, mas o lado escolhido depende da estrutura.', advanced: 'Às vezes adiar o roque mantém flexibilidade, desde que o centro esteja sob controle.', keywords: ['roque', 'rocar', 'castle'] },
  { id: 'promotion', title: 'Promoção', category: 'rules', beginner: 'Quando um peão chega à última fileira, ele deve virar dama, torre, bispo ou cavalo.', intermediate: 'A dama é comum, mas subpromoções podem evitar afogamento ou criar táticas.', advanced: 'Subpromoção é uma ferramenta concreta de cálculo, especialmente em finais e problemas de mate.', keywords: ['promocao', 'promoção', 'promover', 'peao na ultima'] },
  { id: 'en-passant', title: 'En passant', category: 'rules', beginner: 'Um peão pode capturar en passant imediatamente após um peão adversário avançar duas casas e passar por sua casa de captura.', intermediate: 'O direito existe somente no lance imediatamente seguinte.', advanced: 'Em cálculo, en passant pode abrir linhas e até alterar legalidade por exposição do rei.', keywords: ['en passant', 'passagem'] },
  { id: 'center', title: 'Controle do centro', category: 'fundamentals', beginner: 'Peças no centro alcançam mais casas. Procure controlar e4, d4, e5 e d5.', intermediate: 'Controle não exige ocupar todas as casas com peões; peças também podem pressionar o centro.', advanced: 'O valor do centro depende de rupturas, estrutura e capacidade de transformar espaço em atividade.', keywords: ['centro', 'central'] },
  { id: 'development', title: 'Desenvolvimento', category: 'fundamentals', beginner: 'Na abertura, tire cavalos e bispos das casas iniciais e evite mover a mesma peça muitas vezes sem motivo.', intermediate: 'Desenvolvimento deve criar coordenação e contestar casas importantes.', advanced: 'Tempos de desenvolvimento podem ser convertidos em iniciativa quando o centro está aberto.', keywords: ['desenvolvimento', 'desenvolver', 'abertura'] },
  { id: 'king-safety', title: 'Segurança do rei', category: 'fundamentals', beginner: 'Evite deixar o rei no centro quando linhas começam a abrir. O roque costuma ajudar.', intermediate: 'Compare quantidade de atacantes, defensores e linhas abertas perto de cada rei.', advanced: 'Segurança é dinâmica: um rei centralizado pode ser forte em finais e vulnerável em posições abertas.', keywords: ['rei', 'seguranca', 'segurança'] },
  { id: 'fork', title: 'Garfo', category: 'tactics', beginner: 'Um garfo acontece quando uma peça ataca dois ou mais alvos ao mesmo tempo.', intermediate: 'Cavalos são famosos por garfos, mas peões, damas, bispos, torres e reis também fazem ataques duplos.', advanced: 'Procure casas de entrada criadas por lances forçados, especialmente com xeque.', keywords: ['garfo', 'fork', 'ataque duplo'] },
  { id: 'pin', title: 'Cravada', category: 'tactics', beginner: 'Uma peça está cravada quando movê-la expõe algo mais valioso atrás dela, muitas vezes o rei.', intermediate: 'Cravadas relativas podem ser quebradas; cravadas absolutas contra o rei restringem legalmente o movimento.', advanced: 'Aumentar pressão sobre a peça cravada pode gerar ganho material ou ruptura estrutural.', keywords: ['cravada', 'pin'] },
  { id: 'skewer', title: 'Espeto', category: 'tactics', beginner: 'No espeto, a peça mais valiosa é atacada primeiro e, ao sair, revela uma peça atrás.', intermediate: 'É o “inverso visual” de muitas cravadas.', advanced: 'Espetos aparecem com frequência em linhas abertas de torre, bispo e dama.', keywords: ['espeto', 'skewer'] },
  { id: 'discovered', title: 'Ataque descoberto', category: 'tactics', beginner: 'Uma peça sai da frente e revela o ataque de outra peça.', intermediate: 'Se a peça que sai também cria uma ameaça, você ganha dois tempos em um lance.', advanced: 'Xeques descobertos e duplos são extremamente forçados e devem ser calculados primeiro.', keywords: ['descoberto', 'ataque descoberto', 'xeque duplo'] },
  { id: 'remove-defender', title: 'Remoção do defensor', category: 'tactics', beginner: 'Se uma peça importante depende de um único defensor, remover esse defensor pode fazer o alvo cair.', intermediate: 'Trocas e desvios são ferramentas comuns para remover defensores.', advanced: 'Mapeie relações de defesa antes de calcular a sequência concreta.', keywords: ['defensor', 'remocao', 'remoção'] },
  { id: 'open-files', title: 'Colunas abertas', category: 'strategy', beginner: 'Torres gostam de colunas sem peões.', intermediate: 'Uma coluna semiaberta também pode ser valiosa para pressionar peões adversários.', advanced: 'Dominar uma coluna só importa se houver casas de invasão ou alvos úteis.', keywords: ['coluna aberta', 'torre', 'coluna'] },
  { id: 'weak-squares', title: 'Casas fracas', category: 'strategy', beginner: 'Uma casa é fraca quando peões não conseguem defendê-la facilmente.', intermediate: 'Cavalos podem virar excelentes bloqueadores em casas avançadas protegidas.', advanced: 'A fraqueza deve ser explorável; uma casa sem rota de acesso pode ser apenas uma característica estética.', keywords: ['casa fraca', 'outpost', 'posto avançado'] },
  { id: 'pawn-structure', title: 'Estrutura de peões', category: 'strategy', beginner: 'Peões criam espaço e também fraquezas permanentes. Pense antes de empurrá-los.', intermediate: 'Peões isolados, dobrados, atrasados e passados exigem planos diferentes.', advanced: 'Estruturas determinam rupturas, peças boas e planos de longo prazo.', keywords: ['peao', 'peão', 'estrutura', 'isolado', 'dobrado'] },
  { id: 'opposition', title: 'Oposição', category: 'endgames', beginner: 'Em finais de reis e peões, colocar os reis frente a frente pode forçar o adversário a ceder passagem.', intermediate: 'Oposição direta, distante e diagonal ajudam a controlar casas críticas.', advanced: 'O conceito é um caso de zugzwang e deve ser combinado com casas-chave.', keywords: ['oposicao', 'oposição', 'rei e peao', 'final de peoes'] },
  { id: 'passed-pawn', title: 'Peão passado', category: 'endgames', beginner: 'Um peão passado não tem peões adversários à frente em sua coluna ou colunas vizinhas.', intermediate: 'Peões passados devem ser empurrados quando isso não abandona tarefas mais urgentes.', advanced: 'Passados conectados, distantes e protegidos possuem valores estratégicos diferentes.', keywords: ['passado', 'peao passado', 'peão passado'] },
  { id: 'rook-endgame', title: 'Finais de torre', category: 'endgames', beginner: 'Ative a torre e o rei. Uma torre passiva sofre muito.', intermediate: 'Torres costumam funcionar melhor atrás de peões passados.', advanced: 'Lucena, Philidor, corte do rei e atividade são referências essenciais.', keywords: ['final de torre', 'torre', 'lucena', 'philidor'] },
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function findConcept(question: string): ChessConcept | null {
  const normalized = normalize(question);
  return CONCEPTS.find((concept) => concept.keywords.some((keyword) => normalized.includes(normalize(keyword)))) ?? null;
}

export function conceptExplanation(concept: ChessConcept, level: TeachingLevel): string {
  if (level === 'advanced') return concept.advanced;
  if (level === 'intermediate') return concept.intermediate;
  return concept.beginner;
}

export function detectOpening(history: string[]): OpeningLesson | null {
  if (history.length === 0) return null;
  let best: OpeningLesson | null = null;
  for (const opening of OPENING_LIBRARY) {
    // Não antecipe uma variante que ainda depende de lances futuros.
    // A abertura só recebe um nome quando toda a sequência mínima cadastrada
    // já apareceu no histórico recebido.
    if (history.length < opening.moves.length) continue;

    let matches = true;
    for (let index = 0; index < opening.moves.length; index += 1) {
      if (history[index] !== opening.moves[index]) {
        matches = false;
        break;
      }
    }
    if (matches && (!best || opening.moves.length > best.moves.length)) best = opening;
  }
  return best;
}