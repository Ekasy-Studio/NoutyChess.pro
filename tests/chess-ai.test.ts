import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';

import { chooseAiMove, evaluatePosition } from '../lib/chess-ai';

describe('IA do NoutyChess.pro', () => {
  it.each(['easy', 'medium', 'hard', 'expert'] as const)('retorna somente lance legal no nível %s sem alterar a partida real', (difficulty) => {
    const chess = new Chess();
    const before = chess.fen();
    const move = chooseAiMove(chess, difficulty);
    expect(move).not.toBeNull();
    expect(chess.fen()).toBe(before);
    expect(() => new Chess(before).move(move!)).not.toThrow();
  });

  it('reconhece mate e o prefere no nível avançado', () => {
    const chess = new Chess('7k/8/6QK/8/8/8/8/8 w - - 0 1');
    const move = chooseAiMove(chess, 'hard');
    const copy = new Chess(chess.fen());
    copy.move(move!);
    expect(copy.isCheckmate()).toBe(true);
  });

  it('gera promoção legal sem vazar estado', () => {
    const chess = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const before = chess.fen();
    const move = chooseAiMove(chess, 'hard');
    expect(move?.promotion).toBeTruthy();
    expect(chess.fen()).toBe(before);
    expect(() => new Chess(before).move(move!)).not.toThrow();
  });

  it('avalia vantagem material para o lado correto', () => {
    const whiteQueen = new Chess('7k/8/8/8/8/8/8/Q3K3 w - - 0 1');
    const blackQueen = new Chess('q6k/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(evaluatePosition(whiteQueen)).toBeGreaterThan(0);
    expect(evaluatePosition(blackQueen)).toBeLessThan(0);
  });
});
