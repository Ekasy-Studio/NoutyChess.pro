import { describe, expect, it } from 'vitest';

import {
  CONCEPTS,
  OPENING_LIBRARY,
  TEACHERS,
  conceptExplanation,
  detectOpening,
  findConcept,
} from '../lib/chess-knowledge';

describe('base educacional do NoutyChess', () => {
  it('mantém os dois professores com identidades distintas', () => {
    expect(TEACHERS.niclaus.name).toBe('Niclaus');
    expect(TEACHERS.damon.name).toBe('Damon');
    expect(TEACHERS.niclaus.tone).not.toBe(TEACHERS.damon.tone);
  });

  it('reconhece conceitos mesmo com acentuação e linguagem natural', () => {
    expect(findConcept('Como funciona a promoção do peão?')?.id).toBe('promotion');
    expect(findConcept('Quero entender oposicao no final')?.id).toBe('opposition');
    expect(findConcept('O que é um ataque duplo?')?.id).toBe('fork');
  });

  it('adapta a explicação ao nível do aluno', () => {
    const concept = findConcept('controle do centro');
    expect(concept).not.toBeNull();
    expect(conceptExplanation(concept!, 'beginner')).not.toBe(conceptExplanation(concept!, 'advanced'));
  });

  it('detecta aberturas conhecidas pela sequência de lances', () => {
    expect(detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])?.name).toBe('Abertura Italiana');
    expect(detectOpening(['e4', 'c5'])?.name).toBe('Defesa Siciliana');
    expect(detectOpening(['d4', 'd5', 'c4'])?.name).toBe('Gambito da Dama');
  });

  it('não inventa abertura quando a sequência não corresponde à biblioteca', () => {
    expect(detectOpening(['a3', 'h6', 'Ra2'])).toBeNull();
  });

  it('mantém repertório e conceitos em volume útil para os professores', () => {
    expect(OPENING_LIBRARY.length).toBeGreaterThanOrEqual(15);
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(CONCEPTS.map((concept) => concept.id)).size).toBe(CONCEPTS.length);
  });
});
