export type OnlineClockPhase = 'idle' | 'connecting' | 'waiting' | 'connected' | 'disconnected' | 'error';

export function shouldAdvanceOnlineClock(
  phase: OnlineClockPhase,
  playerColor: 'w' | 'b',
): boolean {
  if (phase === 'connected') return true;
  return phase === 'disconnected' && playerColor === 'w';
}
