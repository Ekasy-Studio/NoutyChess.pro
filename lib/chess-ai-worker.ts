/// <reference lib="webworker" />

import { Chess } from 'chess.js';

import { chooseAiMove, type AiDifficulty, type AiPersonality } from '@/lib/chess-ai';

type AiWorkerRequest = { fen: string; difficulty: AiDifficulty; personality: AiPersonality; token: number };

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  try {
    const { fen, difficulty, personality, token } = event.data;
    const move = chooseAiMove(new Chess(fen), difficulty, personality);
    self.postMessage({ ok: true, move, fen, token });
  } catch {
    self.postMessage({ ok: false, move: null, fen: event.data.fen, token: event.data.token });
  }
};

export {};
