import type { Move } from 'chess.js';

export type GameSoundEvent =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'castle'
  | 'promotion'
  | 'start'
  | 'opponent-found'
  | 'invite'
  | 'message'
  | 'victory'
  | 'defeat'
  | 'draw';

const SOUND_FREQUENCIES: Record<GameSoundEvent, readonly number[]> = {
  move: [360],
  capture: [270, 190],
  check: [520, 650],
  checkmate: [640, 820, 980],
  castle: [320, 430],
  promotion: [420, 620, 840],
  start: [300, 420, 540],
  'opponent-found': [440, 660, 880],
  invite: [520, 700],
  message: [480, 610],
  victory: [440, 620, 820, 1040],
  defeat: [360, 300, 230],
  draw: [400, 400],
};

export function frequenciesForGameSound(event: GameSoundEvent): readonly number[] {
  return SOUND_FREQUENCIES[event];
}

export function soundEventForMove(move: Move): GameSoundEvent {
  // Mate continua sendo o evento máximo. Promoção vem antes de xeque para
  // que o usuário perceba a transformação da peça mesmo quando ela dá xeque.
  if (move.san.includes('#')) return 'checkmate';
  if (move.promotion) return 'promotion';
  if (move.san.includes('+')) return 'check';
  if (move.captured) return 'capture';
  if (move.isKingsideCastle() || move.isQueensideCastle()) return 'castle';
  return 'move';
}
