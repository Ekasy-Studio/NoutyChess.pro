import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getD1(): D1Database {
  if (!env.DB) throw new Error('Cloudflare D1 binding `DB` is unavailable.');
  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY NOT NULL, display_name TEXT NOT NULL, avatar_emote TEXT DEFAULT '♘' NOT NULL, profile_title TEXT DEFAULT 'Desafiante' NOT NULL, board_theme TEXT DEFAULT 'emerald' NOT NULL, piece_theme TEXT DEFAULT 'classic' NOT NULL, rating INTEGER DEFAULT 1200 NOT NULL, peak_rating INTEGER DEFAULT 1200 NOT NULL, games INTEGER DEFAULT 0 NOT NULL, wins INTEGER DEFAULT 0 NOT NULL, draws INTEGER DEFAULT 0 NOT NULL, losses INTEGER DEFAULT 0 NOT NULL, win_streak INTEGER DEFAULT 0 NOT NULL, longest_streak INTEGER DEFAULT 0 NOT NULL, coins INTEGER DEFAULT 100 NOT NULL, xp INTEGER DEFAULT 0 NOT NULL, level INTEGER DEFAULT 1 NOT NULL, banned_until INTEGER, ban_reason TEXT, chat_muted_until INTEGER, chat_mute_reason TEXT, membership_tier TEXT DEFAULT 'free' NOT NULL, member_since INTEGER, member_until INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles (rating)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_banned_until ON profiles (banned_until)`,
  `CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY NOT NULL, host_id TEXT NOT NULL, guest_id TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, matchmaking INTEGER DEFAULT 0 NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_status_last_seen ON rooms (status, last_seen_at)`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms (host_id)`,
  `CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY NOT NULL, room_code TEXT, white_id TEXT NOT NULL, black_id TEXT NOT NULL, result TEXT NOT NULL, pgn TEXT NOT NULL, white_rating_before INTEGER NOT NULL, black_rating_before INTEGER NOT NULL, white_rating_after INTEGER NOT NULL, black_rating_after INTEGER NOT NULL, finished_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_games_white_finished ON games (white_id, finished_at)`,
  `CREATE INDEX IF NOT EXISTS idx_games_black_finished ON games (black_id, finished_at)`,
  `CREATE TABLE IF NOT EXISTS match_reports (room_code TEXT NOT NULL, reporter_id TEXT NOT NULL, reporter_color TEXT NOT NULL, result TEXT NOT NULL, pgn TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (room_code, reporter_id))`,
  `CREATE INDEX IF NOT EXISTS idx_match_reports_room ON match_reports (room_code)`,
  `CREATE TABLE IF NOT EXISTS achievements (user_id TEXT NOT NULL, code TEXT NOT NULL, unlocked_at INTEGER NOT NULL, PRIMARY KEY (user_id, code))`,
  `CREATE TABLE IF NOT EXISTS cosmetic_unlocks (user_id TEXT NOT NULL, cosmetic_code TEXT NOT NULL, granted_by TEXT, acquired_at INTEGER NOT NULL, PRIMARY KEY (user_id, cosmetic_code))`,
  `CREATE TABLE IF NOT EXISTS moderation_actions (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, admin_id TEXT NOT NULL, target_user_id TEXT, room_code TEXT, action TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_moderation_target_created ON moderation_actions (target_user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_moderation_room_created ON moderation_actions (room_code, created_at)`,
  `CREATE TABLE IF NOT EXISTS processed_rewards (idempotency_key TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, reward_type TEXT NOT NULL, xp INTEGER NOT NULL, coins INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_rewards_user_key ON processed_rewards (user_id, idempotency_key)`,
  `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS community_messages (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL, avatar_emote TEXT NOT NULL, message TEXT NOT NULL, room_code TEXT, scope TEXT DEFAULT 'community' NOT NULL, created_at INTEGER NOT NULL, deleted_at INTEGER, deleted_by TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_community_messages_created ON community_messages (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_community_messages_user_created ON community_messages (user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS friendships (pair_key TEXT PRIMARY KEY NOT NULL, user_a TEXT NOT NULL, user_b TEXT NOT NULL, requested_by TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_friendships_user_a_status ON friendships (user_a, status)`,
  `CREATE INDEX IF NOT EXISTS idx_friendships_user_b_status ON friendships (user_b, status)`,
  `CREATE TABLE IF NOT EXISTS friend_invites (id TEXT PRIMARY KEY NOT NULL, sender_id TEXT NOT NULL, recipient_id TEXT NOT NULL, room_code TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_friend_invites_recipient_status ON friend_invites (recipient_id, status, expires_at)`,
  `CREATE TABLE IF NOT EXISTS membership_interest (user_id TEXT PRIMARY KEY NOT NULL, status TEXT DEFAULT 'interested' NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS player_presence (visitor_id TEXT PRIMARY KEY NOT NULL, user_id TEXT, display_name TEXT NOT NULL, room_code TEXT, mode TEXT DEFAULT 'menu' NOT NULL, first_seen_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON player_presence (last_seen_at)`,
  `CREATE INDEX IF NOT EXISTS idx_presence_user_id ON player_presence (user_id)`,
  `CREATE TABLE IF NOT EXISTS visit_sessions (id TEXT PRIMARY KEY NOT NULL, visitor_id TEXT NOT NULL, user_id TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_visit_sessions_created ON visit_sessions (created_at)`,
];

let schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const d1 = getD1();
  await d1.batch(SCHEMA_STATEMENTS.map((statement) => d1.prepare(statement)));
  const profileColumns = await d1.prepare('PRAGMA table_info(profiles)').all<{ name: string }>();
  const profileNames = new Set((profileColumns.results ?? []).map((column) => column.name));
  if (!profileNames.has('avatar_emote')) await d1.prepare("ALTER TABLE profiles ADD COLUMN avatar_emote TEXT DEFAULT '♘' NOT NULL").run();
  if (!profileNames.has('profile_title')) await d1.prepare("ALTER TABLE profiles ADD COLUMN profile_title TEXT DEFAULT 'Desafiante' NOT NULL").run();
  if (!profileNames.has('board_theme')) await d1.prepare("ALTER TABLE profiles ADD COLUMN board_theme TEXT DEFAULT 'emerald' NOT NULL").run();
  if (!profileNames.has('piece_theme')) await d1.prepare("ALTER TABLE profiles ADD COLUMN piece_theme TEXT DEFAULT 'classic' NOT NULL").run();
  if (!profileNames.has('chat_muted_until')) await d1.prepare('ALTER TABLE profiles ADD COLUMN chat_muted_until INTEGER').run();
  if (!profileNames.has('chat_mute_reason')) await d1.prepare('ALTER TABLE profiles ADD COLUMN chat_mute_reason TEXT').run();
  if (!profileNames.has('membership_tier')) await d1.prepare("ALTER TABLE profiles ADD COLUMN membership_tier TEXT DEFAULT 'free' NOT NULL").run();
  if (!profileNames.has('member_since')) await d1.prepare('ALTER TABLE profiles ADD COLUMN member_since INTEGER').run();
  if (!profileNames.has('member_until')) await d1.prepare('ALTER TABLE profiles ADD COLUMN member_until INTEGER').run();
  const messageColumns = await d1.prepare('PRAGMA table_info(community_messages)').all<{ name: string }>();
  if (!(messageColumns.results ?? []).some((column) => column.name === 'scope')) await d1.prepare("ALTER TABLE community_messages ADD COLUMN scope TEXT DEFAULT 'community' NOT NULL").run();
  const roomColumns = await d1.prepare('PRAGMA table_info(rooms)').all<{ name: string }>();
  if (!(roomColumns.results ?? []).some((column) => column.name === 'matchmaking')) await d1.prepare('ALTER TABLE rooms ADD COLUMN matchmaking INTEGER DEFAULT 0 NOT NULL').run();
  await d1.prepare('PRAGMA optimize').run();
  schemaReady = true;
}
