import { Chess, type Color, type Square } from 'chess.js';

export type GameOutcome = {
  kind: 'checkmate' | 'stalemate' | 'insufficient' | 'repetition' | 'fifty-move' | 'seventy-five-move';
  title: string;
  detail: string;
  winner: Color | null;
};

export type NetworkMove = {
  type: 'move';
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n' | null;
  ply: number;
  previousPosition: string;
};

const SQUARE_PATTERN = /^[a-h][1-8]$/;
const PROMOTION_PATTERN = /^[qrbn]$/;

export function positionKey(chess: Chess): string {
  return chess.fen().split(' ').slice(0, 4).join(' ');
}

export function halfmoveClock(chess: Chess): number {
  const value = Number(chess.fen().split(' ')[4]);
  return Number.isFinite(value) ? value : 0;
}

export function evaluateOutcome(chess: Chess): GameOutcome | null {
  if (chess.isCheckmate()) {
    const winner: Color = chess.turn() === 'w' ? 'b' : 'w';
    return {
      kind: 'checkmate',
      title: 'Xeque-mate',
      detail: winner === 'w' ? 'As brancas venceram.' : 'As pretas venceram.',
      winner,
    };
  }

  if (chess.isStalemate()) {
    return { kind: 'stalemate', title: 'Afogamento', detail: 'A partida terminou empatada.', winner: null };
  }

  if (chess.isInsufficientMaterial()) {
    return { kind: 'insufficient', title: 'Material insuficiente', detail: 'Não existe material para forçar mate.', winner: null };
  }

  if (chess.isThreefoldRepetition()) {
    return { kind: 'repetition', title: 'Repetição de posição', detail: 'A mesma posição ocorreu três vezes.', winner: null };
  }

  const halfmoves = halfmoveClock(chess);
  if (halfmoves >= 150) {
    return { kind: 'seventy-five-move', title: 'Regra dos 75 movimentos', detail: 'A partida terminou automaticamente empatada.', winner: null };
  }

  if (halfmoves >= 100 || chess.isDrawByFiftyMoves()) {
    return { kind: 'fifty-move', title: 'Regra dos 50 movimentos', detail: 'A partida terminou empatada sem captura ou movimento de peão.', winner: null };
  }

  return null;
}

export function isNetworkMove(value: unknown): value is NetworkMove {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.type === 'move'
    && typeof candidate.from === 'string'
    && SQUARE_PATTERN.test(candidate.from)
    && typeof candidate.to === 'string'
    && SQUARE_PATTERN.test(candidate.to)
    && (candidate.promotion === undefined
      || candidate.promotion === null
      || (typeof candidate.promotion === 'string' && PROMOTION_PATTERN.test(candidate.promotion)))
    && Number.isInteger(candidate.ply)
    && Number(candidate.ply) > 0
    && typeof candidate.previousPosition === 'string'
    && candidate.previousPosition.length <= 100;
}

export function applyValidatedNetworkMove(
  chess: Chess,
  payload: unknown,
  remoteColor: Color,
): { ok: true; move: ReturnType<Chess['move']> } | { ok: false; reason: string } {
  if (!isNetworkMove(payload)) return { ok: false, reason: 'Formato de movimento inválido.' };
  if (chess.turn() !== remoteColor) return { ok: false, reason: 'Movimento recebido fora do turno.' };
  if (payload.ply !== chess.history().length + 1) return { ok: false, reason: 'Histórico da partida inconsistente.' };
  if (payload.previousPosition !== positionKey(chess)) return { ok: false, reason: 'Posição da partida dessincronizada.' };

  try {
    const move = chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion ?? undefined });
    if (!move || move.color !== remoteColor) return { ok: false, reason: 'Movimento ilegal.' };
    return { ok: true, move };
  } catch {
    return { ok: false, reason: 'Movimento ilegal.' };
  }
}

export function squareColorName(square: Square): 'clara' | 'escura' {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return (file + rank) % 2 === 0 ? 'escura' : 'clara';
}
