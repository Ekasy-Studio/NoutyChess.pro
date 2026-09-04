import { Chess } from 'chess.js';

export type OnlineClocks = { w: number; b: number };

export type OnlineSyncPayload = {
  type: 'sync';
  protocol: 1;
  fen: string;
  pgn: string;
  clocks: OnlineClocks;
  displayName: string;
};

const MAX_FEN_LENGTH = 120;
const MAX_PGN_LENGTH = 40_000;
const MAX_CLOCK_SECONDS = 24 * 60 * 60;

function safeDisplayName(value: string): string {
  const cleaned = value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
  return cleaned || 'Adversário';
}

function validClock(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= MAX_CLOCK_SECONDS;
}

export function createOnlineSyncPayload(
  chess: Chess,
  clocks: OnlineClocks,
  displayName: string,
): OnlineSyncPayload {
  return {
    type: 'sync',
    protocol: 1,
    fen: chess.fen(),
    pgn: chess.pgn({ maxWidth: 0, newline: '\n' }),
    clocks: {
      w: Math.max(0, Math.min(MAX_CLOCK_SECONDS, clocks.w)),
      b: Math.max(0, Math.min(MAX_CLOCK_SECONDS, clocks.b)),
    },
    displayName: safeDisplayName(displayName),
  };
}

export function restoreOnlineSyncPayload(value: unknown): {
  chess: Chess;
  clocks: OnlineClocks | null;
  displayName: string;
} | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.type !== 'sync' || candidate.protocol !== 1) return null;
  if (typeof candidate.fen !== 'string' || candidate.fen.length === 0 || candidate.fen.length > MAX_FEN_LENGTH) return null;
  if (typeof candidate.displayName !== 'string') return null;

  let chess: Chess;
  try {
    if (typeof candidate.pgn === 'string' && candidate.pgn.length <= MAX_PGN_LENGTH && candidate.pgn.trim()) {
      chess = new Chess();
      chess.loadPgn(candidate.pgn, { strict: false });
      if (chess.fen() !== candidate.fen) return null;
    } else {
      chess = new Chess(candidate.fen);
    }
  } catch {
    return null;
  }

  let clocks: OnlineClocks | null = null;
  if (candidate.clocks && typeof candidate.clocks === 'object') {
    const raw = candidate.clocks as Record<string, unknown>;
    if (!validClock(raw.w) || !validClock(raw.b)) return null;
    clocks = { w: raw.w, b: raw.b };
  }

  return {
    chess,
    clocks,
    displayName: safeDisplayName(candidate.displayName),
  };
}
