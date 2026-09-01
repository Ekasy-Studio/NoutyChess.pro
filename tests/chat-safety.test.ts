import { describe, expect, it } from 'vitest';

import { chatSafetyReason } from '../lib/chat-safety';

describe('segurança do chat', () => {
  it('permite conversa esportiva normal', () => {
    expect(chatSafetyReason('Boa partida! Vamos jogar outra depois?')).toBeNull();
  });

  it('bloqueia ofensa mesmo com acento ou substituição numérica', () => {
    expect(chatSafetyReason('Você é um otário')).toBeTruthy();
    expect(chatSafetyReason('seu 1d10ta')).toBeTruthy();
  });

  it('bloqueia links no chat da partida', () => {
    expect(chatSafetyReason('acesse https://exemplo.com')).toBeTruthy();
  });
});
