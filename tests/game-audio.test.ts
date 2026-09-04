import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';

import { frequenciesForGameSound, soundEventForMove } from '../lib/game-audio';

describe('eventos sonoros do NoutyChess', () => {
  it('mantém sinais distintos para eventos importantes', () => {
    expect(frequenciesForGameSound('opponent-found')).not.toEqual(frequenciesForGameSound('message'));
    expect(frequenciesForGameSound('victory')).not.toEqual(frequenciesForGameSound('defeat'));
    expect(frequenciesForGameSound('promotion').length).toBeGreaterThan(1);
  });

  it('classifica movimento comum e captura', () => {
    const chess = new Chess();
    expect(soundEventForMove(chess.move('e4'))).toBe('move');
    chess.move('d5');
    expect(soundEventForMove(chess.move('exd5'))).toBe('capture');
  });

  it('prioriza xeque e mate sobre o som básico do movimento', () => {
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    expect(soundEventForMove(chess.move('Qh4#'))).toBe('checkmate');
  });

  it('reconhece roque e promoção', () => {
    const castle = new Chess('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(soundEventForMove(castle.move('O-O'))).toBe('castle');

    const promotion = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    expect(soundEventForMove(promotion.move({ from: 'a7', to: 'a8', promotion: 'q' }))).toBe('promotion');
  });
});
