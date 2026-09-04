import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';

import { applyValidatedNetworkMove, positionKey, type NetworkMove } from '../lib/chess-engine';

function receive(chess: Chess, move: Omit<NetworkMove, 'type' | 'ply' | 'previousPosition'>, color: 'w' | 'b') {
  const payload: NetworkMove = {
    type: 'move',
    ...move,
    ply: chess.history().length + 1,
    previousPosition: positionKey(chess),
  };
  return applyValidatedNetworkMove(chess, payload, color);
}

describe('jogadas especiais recebidas pelo multiplayer', () => {
  it('sincroniza promoção e mantém a peça escolhida', () => {
    const chess = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const result = receive(chess, { from: 'a7', to: 'a8', promotion: 'q' }, 'w');

    expect(result.ok).toBe(true);
    expect(chess.get('a8')).toMatchObject({ type: 'q', color: 'w' });
    expect(chess.get('a7')).toBeUndefined();
  });

  it('sincroniza roque e move rei e torre no cliente remoto', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    const result = receive(chess, { from: 'e1', to: 'g1' }, 'w');

    expect(result.ok).toBe(true);
    expect(chess.get('g1')).toMatchObject({ type: 'k', color: 'w' });
    expect(chess.get('f1')).toMatchObject({ type: 'r', color: 'w' });
    expect(chess.get('h1')).toBeUndefined();
  });

  it('sincroniza en passant e remove o peão capturado', () => {
    const chess = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const result = receive(chess, { from: 'e5', to: 'd6' }, 'w');

    expect(result.ok).toBe(true);
    expect(chess.get('d6')).toMatchObject({ type: 'p', color: 'w' });
    expect(chess.get('d5')).toBeUndefined();
  });

  it('rejeita promoção inválida sem alterar a posição', () => {
    const chess = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    const before = chess.fen();
    const result = receive(chess, { from: 'a7', to: 'a8', promotion: 'k' as 'q' }, 'w');

    expect(result.ok).toBe(false);
    expect(chess.fen()).toBe(before);
  });
});
