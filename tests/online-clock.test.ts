import { describe, expect, it } from 'vitest';

import { shouldAdvanceOnlineClock } from '../lib/online-clock';

describe('relógio durante reconexão online', () => {
  it('avança nos dois clientes enquanto a partida está conectada', () => {
    expect(shouldAdvanceOnlineClock('connected', 'w')).toBe(true);
    expect(shouldAdvanceOnlineClock('connected', 'b')).toBe(true);
  });

  it('mantém somente o host como referência durante desconexão', () => {
    expect(shouldAdvanceOnlineClock('disconnected', 'w')).toBe(true);
    expect(shouldAdvanceOnlineClock('disconnected', 'b')).toBe(false);
  });

  it('não inicia o relógio no lobby ou durante conexão inicial', () => {
    expect(shouldAdvanceOnlineClock('idle', 'w')).toBe(false);
    expect(shouldAdvanceOnlineClock('connecting', 'w')).toBe(false);
    expect(shouldAdvanceOnlineClock('waiting', 'w')).toBe(false);
    expect(shouldAdvanceOnlineClock('error', 'w')).toBe(false);
  });
});
