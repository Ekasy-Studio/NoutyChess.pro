import { Chess } from 'chess.js';

import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { ensureSchema, getD1 } from '@/db';

export type Division = { name: string; shortName: string; color: string; floor: number; ceiling: number };
export type CompetitiveProfile = {
  userId: string;
  displayName: string;
  avatarEmote: string;
  profileTitle: string;
  boardTheme: string;
  pieceTheme: string;
  unlockedCosmetics: string[];
  rating: number;
  peakRating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winStreak: number;
  longestStreak: number;
  coins: number;
  xp: number;
  level: number;
  bannedUntil: number | null;
  banReason: string | null;
  chatMutedUntil: number | null;
  chatMuteReason: string | null;
  membershipTier: 'free' | 'legend';
  memberSince: number | null;
  memberUntil: number | null;
};
export type LeaderboardEntry = Pick<CompetitiveProfile, 'userId' | 'displayName' | 'avatarEmote' | 'profileTitle' | 'rating' | 'games' | 'wins'> & { rank: number };

const DIVISIONS: Division[] = [
  { name: 'Bronze', shortName: 'BR', color: '#bf855c', floor: 0, ceiling: 999 },
  { name: 'Prata', shortName: 'PR', color: '#c5ced3', floor: 1000, ceiling: 1299 },
  { name: 'Ouro', shortName: 'OU', color: '#e7b94d', floor: 1300, ceiling: 1599 },
  { name: 'Platina', shortName: 'PL', color: '#66d2bf', floor: 1600, ceiling: 1899 },
  { name: 'Diamante', shortName: 'DI', color: '#5ca9ff', floor: 1900, ceiling: 2199 },
  { name: 'Mestre', shortName: 'ME', color: '#bd83ff', floor: 2200, ceiling: 2499 },
  { name: 'Lendário', shortName: 'LE', color: '#f4c85f', floor: 2500, ceiling: 3000 },
];

export function divisionForRating(rating: number): Division {
  return DIVISIONS.find((division) => rating >= division.floor && rating <= division.ceiling) ?? DIVISIONS.at(-1)!;
}

export function xpForNextLevel(level: number): number {
  return 500 + Math.max(0, level - 1) * 125;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rowToProfile(row: Record<string, unknown>): CompetitiveProfile {
  const memberUntil = nullableNumber(row.member_until);
  return {
    userId: String(row.user_id),
    displayName: String(row.display_name),
    avatarEmote: String(row.avatar_emote ?? '♘'),
    profileTitle: String(row.profile_title ?? 'Desafiante'),
    boardTheme: String(row.board_theme ?? 'emerald'),
    pieceTheme: String(row.piece_theme ?? 'classic'),
    unlockedCosmetics: [],
    rating: Number(row.rating),
    peakRating: Number(row.peak_rating),
    games: Number(row.games),
    wins: Number(row.wins),
    draws: Number(row.draws),
    losses: Number(row.losses),
    winStreak: Number(row.win_streak),
    longestStreak: Number(row.longest_streak),
    coins: Number(row.coins),
    xp: Number(row.xp),
    level: Number(row.level),
    bannedUntil: nullableNumber(row.banned_until),
    banReason: row.ban_reason === null || row.ban_reason === undefined ? null : String(row.ban_reason),
    chatMutedUntil: nullableNumber(row.chat_muted_until),
    chatMuteReason: row.chat_mute_reason === null || row.chat_mute_reason === undefined ? null : String(row.chat_mute_reason),
    membershipTier: row.membership_tier === 'legend' && Boolean(memberUntil && memberUntil > Date.now()) ? 'legend' : 'free',
    memberSince: nullableNumber(row.member_since),
    memberUntil,
  };
}

export async function getOrCreateProfile(user: ChatGPTUser): Promise<CompetitiveProfile> {
  await ensureSchema();
  const d1 = getD1();
  const now = Date.now();
  const displayName = user.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 40) || 'Jogador';
  await d1.prepare(
    `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at`,
  ).bind(user.userId, displayName, now, now).run();
  const row = await d1.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(user.userId).first<Record<string, unknown>>();
  if (!row) throw new Error('Não foi possível carregar o perfil competitivo.');
  const profile = rowToProfile(row);
  const unlocks = await d1.prepare('SELECT cosmetic_code FROM cosmetic_unlocks WHERE user_id = ?').bind(user.userId).all<{ cosmetic_code: string }>();
  profile.unlockedCosmetics = (unlocks.results ?? []).map((item) => item.cosmetic_code);
  return profile;
}

const ALLOWED_EMOTES = new Set(['♘', '♛', '♜', '♝', '♚', '⚔️', '🦁', '🐉', '🦉', '🔥', '⚡', '💎']);
const ALLOWED_TITLES = new Set(['Desafiante', 'Estrategista', 'Caçador de reis', 'Mestre tático', 'Guardião do centro', 'Lenda da arena']);
const FREE_BOARDS = new Set(['emerald', 'wood', 'midnight']);
const FREE_PIECES = new Set(['classic', 'modern', 'minimal']);
export const COSMETIC_PRICES: Record<string, number> = {
  'board:ocean': 2_000,
  'board:royal': 3_500,
  'board:obsidian': 4_800,
  'pieces:neo': 2_400,
  'pieces:royal': 6_000,
};

const MEMBER_BOARD = 'board:aurora';
const MEMBER_PIECES = 'pieces:prisma';

export async function updatePublicProfile(user: ChatGPTUser, input: { displayName: string; avatarEmote: string; profileTitle: string; boardTheme: string; pieceTheme: string }): Promise<CompetitiveProfile> {
  await ensureSchema();
  const current = await getOrCreateProfile(user);
  const displayName = input.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
  if (displayName.length < 2) throw new Error('O nome precisa ter pelo menos 2 caracteres.');
  if (!ALLOWED_EMOTES.has(input.avatarEmote)) throw new Error('Emote de perfil inválido.');
  if (!ALLOWED_TITLES.has(input.profileTitle)) throw new Error('Título de perfil inválido.');
  const boardOptions = new Set([...FREE_BOARDS, 'royal', 'ocean', 'obsidian', 'aurora']);
  const pieceOptions = new Set([...FREE_PIECES, 'neo', 'royal', 'prisma']);
  if (!boardOptions.has(input.boardTheme) || !pieceOptions.has(input.pieceTheme)) throw new Error('Cosmético inválido.');
  const allowed = new Set(current.unlockedCosmetics);
  if (input.boardTheme === 'aurora' && current.membershipTier !== 'legend') throw new Error('O tabuleiro Aurora é exclusivo do Clube Lendário.');
  if (input.pieceTheme === 'prisma' && current.membershipTier !== 'legend') throw new Error('As peças Prisma são exclusivas do Clube Lendário.');
  if (!FREE_BOARDS.has(input.boardTheme) && input.boardTheme !== 'aurora' && !allowed.has(`board:${input.boardTheme}`)) throw new Error('Este tabuleiro ainda não foi desbloqueado.');
  if (!FREE_PIECES.has(input.pieceTheme) && input.pieceTheme !== 'prisma' && !allowed.has(`pieces:${input.pieceTheme}`)) throw new Error('Este conjunto de peças ainda não foi desbloqueado.');
  const d1 = getD1();
  const result = await d1.prepare('UPDATE profiles SET display_name = ?, avatar_emote = ?, profile_title = ?, board_theme = ?, piece_theme = ?, updated_at = ? WHERE user_id = ?')
    .bind(displayName, input.avatarEmote, input.profileTitle, input.boardTheme, input.pieceTheme, Date.now(), user.userId).run();
  if ((result.meta.changes ?? 0) !== 1) throw new Error('Não foi possível salvar o perfil.');
  const row = await d1.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(user.userId).first<Record<string, unknown>>();
  if (!row) throw new Error('Perfil não encontrado.');
  const profile = rowToProfile(row);
  profile.unlockedCosmetics = current.unlockedCosmetics;
  return profile;
}

export async function purchaseCosmetic(user: ChatGPTUser, cosmeticCode: string): Promise<CompetitiveProfile> {
  if (cosmeticCode === MEMBER_BOARD || cosmeticCode === MEMBER_PIECES) throw new Error('Este item pertence ao Clube Lendário.');
  const price = COSMETIC_PRICES[cosmeticCode];
  if (!price) throw new Error('Cosmético inválido.');
  await ensureSchema();
  const profile = await getOrCreateProfile(user);
  if (profile.unlockedCosmetics.includes(cosmeticCode)) return profile;
  if (profile.coins < price) throw new Error(`Você precisa de ${price.toLocaleString('pt-BR')} moedas para este item.`);
  const d1 = getD1();
  const debit = await d1.prepare('UPDATE profiles SET coins = coins - ?, updated_at = ? WHERE user_id = ? AND coins >= ?')
    .bind(price, Date.now(), user.userId, price).run();
  if ((debit.meta.changes ?? 0) !== 1) throw new Error('Saldo insuficiente.');
  try {
    await d1.prepare('INSERT INTO cosmetic_unlocks (user_id, cosmetic_code, acquired_at) VALUES (?, ?, ?)')
      .bind(user.userId, cosmeticCode, Date.now()).run();
  } catch (error) {
    await d1.prepare('UPDATE profiles SET coins = coins + ? WHERE user_id = ?').bind(price, user.userId).run();
    throw error;
  }
  return getOrCreateProfile(user);
}

export async function listLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  await ensureSchema();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const result = await getD1().prepare(
    'SELECT user_id, display_name, avatar_emote, profile_title, rating, games, wins FROM profiles WHERE banned_until IS NULL OR banned_until < ? ORDER BY rating DESC, wins DESC, games ASC LIMIT ?',
  ).bind(Date.now(), safeLimit).all<Record<string, unknown>>();
  return (result.results ?? []).map((row, index) => ({
    rank: index + 1,
    userId: String(row.user_id),
    displayName: String(row.display_name),
    avatarEmote: String(row.avatar_emote ?? '♘'),
    profileTitle: String(row.profile_title ?? 'Desafiante'),
    rating: Number(row.rating),
    games: Number(row.games),
    wins: Number(row.wins),
  }));
}

export async function heartbeatRoom(user: ChatGPTUser, code: string, role: 'host' | 'guest', matchmaking = false): Promise<void> {
  await ensureSchema();
  const d1 = getD1();
  const profile = await getOrCreateProfile(user);
  if (profile.bannedUntil && profile.bannedUntil > Date.now()) throw new Error('Sua conta está temporariamente suspensa.');
  const now = Date.now();

  if (role === 'host') {
    const result = await d1.prepare(
      `INSERT INTO rooms (code, host_id, status, created_at, last_seen_at, matchmaking) VALUES (?, ?, 'waiting', ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET last_seen_at = excluded.last_seen_at, matchmaking = excluded.matchmaking
       WHERE rooms.host_id = excluded.host_id AND rooms.status IN ('waiting','playing')`,
    ).bind(code, user.userId, now, now, matchmaking ? 1 : 0).run();
    if ((result.meta.changes ?? 0) !== 1) throw new Error('Este código de sala já está em uso. Crie outra sala.');
    return;
  }

  const result = await d1.prepare(`UPDATE rooms
    SET guest_id = ?, status = 'playing', matchmaking = 0, last_seen_at = ?
    WHERE code = ?
      AND host_id != ?
      AND status IN ('waiting','playing')
      AND (guest_id IS NULL OR guest_id = ?)`)
    .bind(user.userId, now, code, user.userId, user.userId).run();
  if ((result.meta.changes ?? 0) !== 1) {
    const room = await d1.prepare('SELECT host_id, guest_id, status FROM rooms WHERE code = ?').bind(code).first<Record<string, unknown>>();
    if (!room || room.status === 'closed' || room.status === 'terminated') throw new Error('Sala indisponível.');
    if (String(room.host_id) === user.userId) throw new Error('Você não pode enfrentar a própria conta.');
    throw new Error('A sala já está completa.');
  }
}

export async function findAutomaticMatch(user: ChatGPTUser): Promise<{ roomCode: string; role: 'guest' } | null> {
  await ensureSchema();
  const profile = await getOrCreateProfile(user);
  if (profile.bannedUntil && profile.bannedUntil > Date.now()) throw new Error('Sua conta está temporariamente suspensa.');
  const d1 = getD1();
  const now = Date.now();
  const staleBefore = now - 90_000;
  await d1.prepare("UPDATE rooms SET status = 'closed', matchmaking = 0 WHERE matchmaking = 1 AND status = 'waiting' AND last_seen_at <= ?").bind(staleBefore).run();
  const candidates = await d1.prepare(
    `SELECT code FROM rooms WHERE matchmaking = 1 AND status = 'waiting' AND guest_id IS NULL AND host_id != ? AND last_seen_at > ? ORDER BY created_at ASC LIMIT 5`,
  ).bind(user.userId, staleBefore).all<{ code: string }>();
  for (const candidate of candidates.results ?? []) {
    const result = await d1.prepare(
      `UPDATE rooms SET guest_id = ?, status = 'playing', matchmaking = 0, last_seen_at = ?
       WHERE code = ? AND matchmaking = 1 AND guest_id IS NULL AND status = 'waiting' AND host_id != ? AND last_seen_at > ?`,
    ).bind(user.userId, now, candidate.code, user.userId, staleBefore).run();
    if ((result.meta.changes ?? 0) === 1) return { roomCode: candidate.code, role: 'guest' };
  }
  return null;
}

export async function closeRoom(userId: string, code: string): Promise<void> {
  await ensureSchema();
  await getD1().prepare(
    `UPDATE rooms SET status = 'closed', matchmaking = 0, last_seen_at = ? WHERE code = ? AND (host_id = ? OR guest_id = ?)`,
  ).bind(Date.now(), code, userId, userId).run();
}

function eloAfter(self: number, opponent: number, score: number): number {
  const expected = 1 / (1 + 10 ** ((opponent - self) / 400));
  return Math.max(100, Math.min(3000, Math.round(self + 32 * (score - expected))));
}

function validatedPgn(pgn: string, claimedResult: string): string {
  if (pgn.length < 3 || pgn.length > 40_000) throw new Error('PGN inválido.');
  const chess = new Chess();
  chess.loadPgn(pgn, { strict: false });
  if (chess.history().length < 1) throw new Error('Partida vazia.');
  const normalized = chess.pgn({ maxWidth: 0, newline: '\n' });
  const headers = chess.getHeaders();
  if (headers.Result && headers.Result !== claimedResult) throw new Error('Resultado não confere com o PGN.');
  return normalized;
}

export async function submitMatchReport(user: ChatGPTUser, input: { roomCode: string; color: ColorCode; result: MatchResult; pgn: string }): Promise<{ confirmed: boolean }> {
  await ensureSchema();
  const d1 = getD1();
  const room = await d1.prepare('SELECT host_id, guest_id, status FROM rooms WHERE code = ?').bind(input.roomCode).first<Record<string, unknown>>();
  if (!room || !room.guest_id) throw new Error('Sala competitiva inválida.');
  const expectedId = input.color === 'w' ? String(room.host_id) : String(room.guest_id);
  if (expectedId !== user.userId) throw new Error('Cor do jogador inválida.');
  const pgn = validatedPgn(input.pgn, input.result);
  const now = Date.now();
  await d1.prepare(
    `INSERT INTO match_reports (room_code, reporter_id, reporter_color, result, pgn, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(room_code, reporter_id) DO UPDATE SET result = excluded.result, pgn = excluded.pgn, created_at = excluded.created_at`,
  ).bind(input.roomCode, user.userId, input.color, input.result, pgn, now).run();

  const reports = await d1.prepare('SELECT reporter_id, reporter_color, result, pgn FROM match_reports WHERE room_code = ?').bind(input.roomCode).all<Record<string, unknown>>();
  if ((reports.results?.length ?? 0) !== 2) return { confirmed: false };
  const [first, second] = reports.results!;
  if (first.result !== second.result || first.pgn !== second.pgn || first.reporter_color === second.reporter_color) return { confirmed: false };
  const existing = await d1.prepare('SELECT id FROM games WHERE id = ?').bind(input.roomCode).first();
  if (existing) return { confirmed: true };

  const whiteId = String(room.host_id);
  const blackId = String(room.guest_id);
  const white = await d1.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(whiteId).first<Record<string, unknown>>();
  const black = await d1.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(blackId).first<Record<string, unknown>>();
  if (!white || !black) throw new Error('Perfis da partida não encontrados.');
  const whiteRating = Number(white.rating);
  const blackRating = Number(black.rating);
  const whiteScore = input.result === '1-0' ? 1 : input.result === '1/2-1/2' ? .5 : 0;
  const blackScore = 1 - whiteScore;
  const whiteAfter = eloAfter(whiteRating, blackRating, whiteScore);
  const blackAfter = eloAfter(blackRating, whiteRating, blackScore);
  const whiteWon = whiteScore === 1;
  const blackWon = blackScore === 1;
  const draw = whiteScore === .5;

  await d1.batch([
    d1.prepare(`INSERT INTO games (id, room_code, white_id, black_id, result, pgn, white_rating_before, black_rating_before, white_rating_after, black_rating_after, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(input.roomCode, input.roomCode, whiteId, blackId, input.result, pgn, whiteRating, blackRating, whiteAfter, blackAfter, now),
    d1.prepare(`UPDATE profiles SET rating = ?, peak_rating = MAX(peak_rating, ?), games = games + 1, wins = wins + ?, draws = draws + ?, losses = losses + ?, win_streak = ?, longest_streak = MAX(longest_streak, ?), xp = xp + ?, coins = coins + ?, level = 1 + CAST((xp + ?) / 500 AS INTEGER), updated_at = ? WHERE user_id = ?`)
      .bind(whiteAfter, whiteAfter, whiteWon ? 1 : 0, draw ? 1 : 0, !whiteWon && !draw ? 1 : 0, whiteWon ? Number(white.win_streak) + 1 : 0, whiteWon ? Number(white.win_streak) + 1 : 0, whiteWon ? 120 : draw ? 80 : 50, whiteWon ? 60 : draw ? 35 : 20, whiteWon ? 120 : draw ? 80 : 50, now, whiteId),
    d1.prepare(`UPDATE profiles SET rating = ?, peak_rating = MAX(peak_rating, ?), games = games + 1, wins = wins + ?, draws = draws + ?, losses = losses + ?, win_streak = ?, longest_streak = MAX(longest_streak, ?), xp = xp + ?, coins = coins + ?, level = 1 + CAST((xp + ?) / 500 AS INTEGER), updated_at = ? WHERE user_id = ?`)
      .bind(blackAfter, blackAfter, blackWon ? 1 : 0, draw ? 1 : 0, !blackWon && !draw ? 1 : 0, blackWon ? Number(black.win_streak) + 1 : 0, blackWon ? Number(black.win_streak) + 1 : 0, blackWon ? 120 : draw ? 80 : 50, blackWon ? 60 : draw ? 35 : 20, blackWon ? 120 : draw ? 80 : 50, now, blackId),
    d1.prepare(`UPDATE rooms SET status = 'closed', matchmaking = 0, last_seen_at = ? WHERE code = ?`).bind(now, input.roomCode),
  ]);
  return { confirmed: true };
}

export type MatchResult = '1-0' | '0-1' | '1/2-1/2';
export type ColorCode = 'w' | 'b';