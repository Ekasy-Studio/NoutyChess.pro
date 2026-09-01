import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js';

export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type AiPersonality = 'niclaus' | 'damon';
export type AiMove = { from: Move['from']; to: Move['to']; promotion?: Move['promotion'] };

const PIECE_VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20_000 };
const MATE_SCORE = 100_000;

const SETTINGS: Record<AiDifficulty, { depth: number; timeMs: number; candidates: number }> = {
  easy: { depth: 1, timeMs: 90, candidates: 5 },
  medium: { depth: 2, timeMs: 260, candidates: 2 },
  hard: { depth: 4, timeMs: 760, candidates: 1 },
  expert: { depth: 5, timeMs: 1_350, candidates: 1 },
};

function positionalBonus(type: PieceSymbol, row: number, col: number, color: Color): number {
  const rankFromHome = color === 'w' ? 7 - row : row;
  const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  const center = Math.round((7 - centerDistance) * 4);

  if (type === 'p') return rankFromHome * 8 + (col >= 2 && col <= 5 ? 5 : 0);
  if (type === 'n') return center * 2;
  if (type === 'b') return center + rankFromHome * 2;
  if (type === 'r') return rankFromHome * 2;
  if (type === 'q') return center;
  return rankFromHome < 2 ? 18 : -center;
}

function pawnStructure(chess: Chess, color: Color): number {
  const files = Array(8).fill(0) as number[];
  for (const rank of chess.board()) {
    for (let col = 0; col < rank.length; col += 1) {
      const piece = rank[col];
      if (piece?.type === 'p' && piece.color === color) files[col] += 1;
    }
  }

  let score = 0;
  files.forEach((count, file) => {
    if (count > 1) score -= (count - 1) * 16;
    if (count > 0 && (files[file - 1] ?? 0) === 0 && (files[file + 1] ?? 0) === 0) score -= 11;
  });
  return score;
}

function strategicPosition(chess: Chess, color: Color): number {
  const board = chess.board();
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const ownPawns = new Set<string>();
  const enemyPawns = new Set<string>();
  let bishops = 0;
  let score = 0;

  for (const rank of board) {
    for (const piece of rank) {
      if (!piece) continue;
      if (piece.type === 'p') (piece.color === color ? ownPawns : enemyPawns).add(piece.square);
      if (piece.color === color && piece.type === 'b') bishops += 1;
    }
  }
  if (bishops >= 2) score += 28;

  for (const rank of board) {
    for (const piece of rank) {
      if (!piece || piece.color !== color) continue;
      const file = piece.square.charCodeAt(0) - 97;
      const rankNumber = Number(piece.square[1]);
      if (piece.type === 'p') {
        let passed = true;
        for (let otherFile = Math.max(0, file - 1); otherFile <= Math.min(7, file + 1); otherFile += 1) {
          for (let otherRank = color === 'w' ? rankNumber + 1 : rankNumber - 1; otherRank >= 1 && otherRank <= 8; otherRank += color === 'w' ? 1 : -1) {
            if (enemyPawns.has(`${FILES_FOR_AI[otherFile]}${otherRank}`)) passed = false;
          }
        }
        if (passed) score += 14 + (color === 'w' ? rankNumber - 2 : 7 - rankNumber) * 8;
      }
      if (piece.type === 'r') {
        const ownPawnOnFile = [...ownPawns].some((square) => square[0] === piece.square[0]);
        const enemyPawnOnFile = [...enemyPawns].some((square) => square[0] === piece.square[0]);
        if (!ownPawnOnFile) score += enemyPawnOnFile ? 12 : 24;
      }
      if (piece.type !== 'k' && chess.isAttacked(piece.square, enemy) && !chess.isAttacked(piece.square, color)) {
        score -= Math.round(PIECE_VALUE[piece.type] * 0.13);
      }
      if (piece.type === 'k') {
        const homeRank = color === 'w' ? '1' : '8';
        if (piece.square === `g${homeRank}` || piece.square === `c${homeRank}`) score += 38;
        if (chess.isAttacked(piece.square, enemy)) score -= 36;
      }
    }
  }

  const center = ['d4', 'e4', 'd5', 'e5'] as const;
  for (const square of center) {
    if (chess.isAttacked(square, color)) score += 9;
    if (chess.isAttacked(square, enemy)) score -= 3;
  }
  return score;
}

const FILES_FOR_AI = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function evaluatePosition(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -MATE_SCORE : MATE_SCORE;
  if (chess.isDraw()) return 0;

  let score = 0;
  const board = chess.board();
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const sign = piece.color === 'w' ? 1 : -1;
      score += sign * (PIECE_VALUE[piece.type] + positionalBonus(piece.type, row, col, piece.color));
    }
  }

  score += pawnStructure(chess, 'w') - pawnStructure(chess, 'b');
  score += strategicPosition(chess, 'w') - strategicPosition(chess, 'b');
  const mobility = chess.moves().length * 2;
  score += chess.turn() === 'w' ? mobility : -mobility;
  if (chess.inCheck()) score += chess.turn() === 'w' ? -28 : 28;
  return score;
}

function movePriority(move: Move): number {
  let score = 0;
  if (move.captured) score += 10 * PIECE_VALUE[move.captured] - PIECE_VALUE[move.piece];
  if (move.promotion) score += PIECE_VALUE[move.promotion] + 700;
  if (move.san.includes('#')) score += MATE_SCORE;
  else if (move.san.includes('+')) score += 80;
  if (move.isKingsideCastle() || move.isQueensideCastle()) score += 55;
  return score;
}

function orderedMoves(chess: Chess): Move[] {
  return chess.moves({ verbose: true }).sort((a, b) => movePriority(b) - movePriority(a));
}

type SearchContext = {
  deadline: number;
  nodes: number;
  timedOut: boolean;
  table: Map<string, { depth: number; score: number }>;
};

function quiescence(chess: Chess, alpha: number, beta: number, context: SearchContext, remaining = 3): number {
  context.nodes += 1;
  if (performance.now() >= context.deadline) {
    context.timedOut = true;
    return evaluatePosition(chess);
  }
  const standPat = evaluatePosition(chess);
  if (remaining <= 0 || chess.isGameOver()) return standPat;
  const maximizing = chess.turn() === 'w';
  let best = standPat;
  if (maximizing) {
    if (best >= beta) return best;
    alpha = Math.max(alpha, best);
  } else {
    if (best <= alpha) return best;
    beta = Math.min(beta, best);
  }

  const forcing = orderedMoves(chess).filter((move) => Boolean(move.captured || move.promotion || move.san.includes('+')));
  for (const move of forcing) {
    chess.move(move);
    const value = quiescence(chess, alpha, beta, context, remaining - 1);
    chess.undo();
    best = maximizing ? Math.max(best, value) : Math.min(best, value);
    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (beta <= alpha || context.timedOut) break;
  }
  return best;
}

function search(chess: Chess, depth: number, alpha: number, beta: number, context: SearchContext): number {
  context.nodes += 1;
  if (performance.now() >= context.deadline) {
    context.timedOut = true;
    return evaluatePosition(chess);
  }
  if (chess.isGameOver()) return evaluatePosition(chess);
  if (depth <= 0) return quiescence(chess, alpha, beta, context);

  const key = `${chess.fen()}|${depth}`;
  const cached = context.table.get(key);
  if (cached && cached.depth >= depth) return cached.score;

  const maximizing = chess.turn() === 'w';
  let best = maximizing ? -Infinity : Infinity;
  const moves = orderedMoves(chess);

  for (const move of moves) {
    chess.move(move);
    const value = search(chess, depth - 1, alpha, beta, context);
    chess.undo();

    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha || context.timedOut) break;
  }

  context.table.set(key, { depth, score: best });
  return best;
}

export function chooseAiMove(position: Chess, difficulty: AiDifficulty, personality: AiPersonality = 'niclaus'): AiMove | null {
  const settings = SETTINGS[difficulty];
  const chess = new Chess(position.fen());
  const legal = orderedMoves(chess);
  if (legal.length === 0) return null;

  const context: SearchContext = {
    deadline: performance.now() + settings.timeMs,
    nodes: 0,
    timedOut: false,
    table: new Map(),
  };
  const maximizing = chess.turn() === 'w';
  let scored: Array<{ move: Move; score: number }> = legal.map((move) => ({ move, score: movePriority(move) }));

  for (let depth = 1; depth <= settings.depth; depth += 1) {
    const iteration: Array<{ move: Move; score: number }> = [];
    context.timedOut = false;
    for (const move of scored.map((entry) => entry.move)) {
      chess.move(move);
      const score = search(chess, depth - 1, -Infinity, Infinity, context);
      chess.undo();
      iteration.push({ move, score });
      if (context.timedOut) break;
    }
    if (context.timedOut || iteration.length !== legal.length) break;
    iteration.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);
    scored = iteration;
  }

  scored.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);
  const personalityPool = personality === 'damon' ? Math.max(settings.candidates, difficulty === 'expert' ? 2 : 3) : settings.candidates;
  const poolSize = Math.min(personalityPool, scored.length);
  const nearBest = scored.filter((entry) => Math.abs(entry.score - scored[0].score) <= (difficulty === 'expert' ? 45 : 100)).slice(0, poolSize);
  const index = (difficulty === 'hard' || difficulty === 'expert') && personality === 'niclaus' ? 0 : Math.floor(Math.random() * Math.max(1, nearBest.length));
  const selected = nearBest[index]?.move ?? scored[0]?.move ?? legal[0];
  return { from: selected.from, to: selected.to, promotion: selected.promotion };
}
