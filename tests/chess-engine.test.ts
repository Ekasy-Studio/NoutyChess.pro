import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';

import {
  applyValidatedNetworkMove,
  evaluateOutcome,
  positionKey,
  type NetworkMove,
} from '../lib/chess-engine';

describe('gerador de movimentos legais', () => {
  it('inicia na posição oficial com 20 lances e perft reconhecido', () => {
    const chess = new Chess();
    expect(chess.moves()).toHaveLength(20);
    expect(chess.perft(1)).toBe(20);
    expect(chess.perft(2)).toBe(400);
    expect(chess.perft(3)).toBe(8902);
  });

  it('valida uma posição Perft complexa com roques, pinos e capturas', () => {
    const chess = new Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(chess.perft(1)).toBe(48);
    expect(chess.perft(2)).toBe(2039);
  });

  it('gera movimentos de peões, cavalos e bloqueia bispos na posição inicial', () => {
    const chess = new Chess();
    expect(chess.moves({ square: 'e2', verbose: true }).map((move) => move.to).sort()).toEqual(['e3', 'e4']);
    expect(chess.moves({ square: 'g1', verbose: true }).map((move) => move.to).sort()).toEqual(['f3', 'h3']);
    expect(chess.moves({ square: 'c1' })).toHaveLength(0);
  });

  it('gera movimentos de bispo, torre, dama e rei em tabuleiro aberto', () => {
    const bishop = new Chess('7k/8/8/3B4/8/8/8/4K3 w - - 0 1');
    expect(bishop.moves({ square: 'd5', verbose: true }).map((move) => move.to)).toEqual(expect.arrayContaining(['a8', 'g8', 'a2', 'h1']));

    const rook = new Chess('7k/8/8/3R4/8/8/8/4K3 w - - 0 1');
    expect(rook.moves({ square: 'd5', verbose: true }).map((move) => move.to)).toEqual(expect.arrayContaining(['d8', 'd1', 'a5', 'h5']));

    const queen = new Chess('7k/8/8/3Q4/8/8/8/4K3 w - - 0 1');
    expect(queen.moves({ square: 'd5' }).length).toBeGreaterThan(20);

    const king = new Chess('7k/8/8/8/8/8/4K3/8 w - - 0 1');
    expect(king.moves({ square: 'e2', verbose: true }).map((move) => move.to)).toEqual(expect.arrayContaining(['d1', 'e1', 'f1', 'd2', 'f2', 'd3', 'e3', 'f3']));
  });

  it('executa captura comum', () => {
    const chess = new Chess('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    const move = chess.move('exd5');
    expect(move.captured).toBe('p');
    expect(chess.get('d5')).toMatchObject({ type: 'p', color: 'w' });
  });

  it('executa en passant removendo o peão correto', () => {
    const chess = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const move = chess.move({ from: 'e5', to: 'd6' });
    expect(move.isEnPassant()).toBe(true);
    expect(chess.get('d6')).toMatchObject({ type: 'p', color: 'w' });
    expect(chess.get('d5')).toBeUndefined();
  });

  it('oferece as quatro promoções e aplica a escolhida', () => {
    const chess = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const promotions = chess.moves({ square: 'a7', verbose: true })
      .filter((move) => move.to === 'a8')
      .map((move) => move.promotion)
      .sort((left, right) => String(left).localeCompare(String(right)));
    expect(promotions).toEqual(['b', 'n', 'q', 'r']);
    chess.move({ from: 'a7', to: 'a8', promotion: 'n' });
    expect(chess.get('a8')).toMatchObject({ type: 'n', color: 'w' });
  });

  it('executa os dois roques e move a torre', () => {
    const kingSide = new Chess('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    kingSide.move('O-O');
    expect(kingSide.get('g1')?.type).toBe('k');
    expect(kingSide.get('f1')?.type).toBe('r');

    const queenSide = new Chess('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    queenSide.move('O-O-O');
    expect(queenSide.get('c1')?.type).toBe('k');
    expect(queenSide.get('d1')?.type).toBe('r');
  });

  it('proíbe roque através de uma casa atacada', () => {
    const chess = new Chess('4kr2/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(chess.moves({ square: 'e1', verbose: true }).some((move) => move.to === 'g1')).toBe(false);
  });

  it('impede que peça cravada exponha o próprio rei', () => {
    const chess = new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
    const rookMoves = chess.moves({ square: 'e2', verbose: true });
    expect(rookMoves.every((move) => move.to[0] === 'e')).toBe(true);
  });

  it('nunca oferece captura física do rei', () => {
    const chess = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
    expect(chess.isCheckmate()).toBe(true);
    expect(chess.moves()).toHaveLength(0);
  });
});

describe('finais oficiais', () => {
  it('detecta xeque e mate', () => {
    const chess = new Chess();
    chess.move('f3'); chess.move('e5'); chess.move('g4'); chess.move('Qh4#');
    expect(chess.inCheck()).toBe(true);
    expect(evaluateOutcome(chess)).toMatchObject({ kind: 'checkmate', winner: 'b' });
  });

  it('detecta afogamento', () => {
    const chess = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(evaluateOutcome(chess)).toMatchObject({ kind: 'stalemate', winner: null });
  });

  it('detecta material insuficiente', () => {
    const chess = new Chess('8/8/8/8/8/2k5/8/4K3 w - - 0 1');
    expect(evaluateOutcome(chess)).toMatchObject({ kind: 'insufficient' });
  });

  it('detecta repetição tripla', () => {
    const chess = new Chess();
    for (let cycle = 0; cycle < 2; cycle += 1) {
      chess.move('Nf3'); chess.move('Nf6'); chess.move('Ng1'); chess.move('Ng8');
    }
    expect(evaluateOutcome(chess)).toMatchObject({ kind: 'repetition' });
  });

  it('aplica as regras de 50 e 75 movimentos', () => {
    const fifty = new Chess('8/8/8/8/8/2k5/8/R3K3 w - - 100 80');
    const seventyFive = new Chess('8/8/8/8/8/2k5/8/R3K3 w - - 150 80');
    expect(evaluateOutcome(fifty)).toMatchObject({ kind: 'fifty-move' });
    expect(evaluateOutcome(seventyFive)).toMatchObject({ kind: 'seventy-five-move' });
  });
});

describe('movimentos recebidos pela rede', () => {
  it('aceita apenas movimento legal, no turno e na posição esperada', () => {
    const chess = new Chess();
    const payload: NetworkMove = { type: 'move', from: 'e2', to: 'e4', ply: 1, previousPosition: positionKey(chess) };
    expect(applyValidatedNetworkMove(chess, payload, 'w').ok).toBe(true);
    expect(chess.get('e4')).toMatchObject({ type: 'p', color: 'w' });
  });

  it('rejeita formato, turno, histórico, dessincronização e ilegalidade', () => {
    const chess = new Chess();
    expect(applyValidatedNetworkMove(chess, { type: 'move', from: '<script>', to: 'e4' }, 'w').ok).toBe(false);
    expect(applyValidatedNetworkMove(chess, { type: 'move', from: 'e7', to: 'e5', ply: 1, previousPosition: positionKey(chess) }, 'b').ok).toBe(false);
    expect(applyValidatedNetworkMove(chess, { type: 'move', from: 'e2', to: 'e4', ply: 9, previousPosition: positionKey(chess) }, 'w').ok).toBe(false);
    expect(applyValidatedNetworkMove(chess, { type: 'move', from: 'e2', to: 'e4', ply: 1, previousPosition: 'outra posição' }, 'w').ok).toBe(false);
    expect(applyValidatedNetworkMove(chess, { type: 'move', from: 'e2', to: 'e5', ply: 1, previousPosition: positionKey(chess) }, 'w').ok).toBe(false);
    expect(chess.fen()).toBe(new Chess().fen());
  });
});
