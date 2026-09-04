import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';

import { createOnlineSyncPayload, restoreOnlineSyncPayload } from '../lib/online-sync';

describe('sincronização de reconexão online', () => {
  it('restaura posição, histórico e relógios sem perder os lances', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('c5');
    chess.move('Nf3');
    chess.move('d6');

    const payload = createOnlineSyncPayload(chess, { w: 541.25, b: 527.5 }, 'Rival');
    const restored = restoreOnlineSyncPayload(payload);

    expect(restored).not.toBeNull();
    expect(restored?.chess.fen()).toBe(chess.fen());
    expect(restored?.chess.history()).toEqual(chess.history());
    expect(restored?.clocks).toEqual({ w: 541.25, b: 527.5 });
    expect(restored?.displayName).toBe('Rival');
  });

  it('continua aceitando o sync antigo que contém apenas FEN', () => {
    const chess = new Chess();
    chess.move('d4');
    const restored = restoreOnlineSyncPayload({
      type: 'sync',
      protocol: 1,
      fen: chess.fen(),
      displayName: 'Adversário antigo',
    });

    expect(restored?.chess.fen()).toBe(chess.fen());
    expect(restored?.clocks).toBeNull();
  });

  it('rejeita PGN que não corresponde ao FEN informado', () => {
    const chess = new Chess();
    chess.move('e4');
    const payload = createOnlineSyncPayload(chess, { w: 600, b: 600 }, 'Rival');

    expect(restoreOnlineSyncPayload({ ...payload, fen: new Chess().fen() })).toBeNull();
  });

  it('rejeita relógios manipulados e sanitiza o nome remoto', () => {
    const chess = new Chess();
    const payload = createOnlineSyncPayload(chess, { w: 600, b: 600 }, '<b>Rival</b>');
    const restored = restoreOnlineSyncPayload(payload);

    expect(restored?.displayName).toBe('bRival/b');
    expect(restoreOnlineSyncPayload({ ...payload, clocks: { w: -1, b: 600 } })).toBeNull();
  });
});
