import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  avatarEmote: text('avatar_emote').notNull().default('♘'),
  profileTitle: text('profile_title').notNull().default('Desafiante'),
  boardTheme: text('board_theme').notNull().default('emerald'),
  pieceTheme: text('piece_theme').notNull().default('classic'),
  rating: integer('rating').notNull().default(1200),
  peakRating: integer('peak_rating').notNull().default(1200),
  games: integer('games').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  coins: integer('coins').notNull().default(100),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  bannedUntil: integer('banned_until'),
  banReason: text('ban_reason'),
  chatMutedUntil: integer('chat_muted_until'),
  chatMuteReason: text('chat_mute_reason'),
  membershipTier: text('membership_tier', { enum: ['free', 'legend'] }).notNull().default('free'),
  memberSince: integer('member_since'),
  memberUntil: integer('member_until'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_profiles_rating').on(table.rating),
  index('idx_profiles_banned_until').on(table.bannedUntil),
]);

export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(),
  hostId: text('host_id').notNull(),
  guestId: text('guest_id'),
  status: text('status', { enum: ['waiting', 'playing', 'closed', 'terminated'] }).notNull(),
  createdAt: integer('created_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
  matchmaking: integer('matchmaking', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_rooms_status_last_seen').on(table.status, table.lastSeenAt),
  index('idx_rooms_host_id').on(table.hostId),
]);

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  roomCode: text('room_code'),
  whiteId: text('white_id').notNull(),
  blackId: text('black_id').notNull(),
  result: text('result', { enum: ['1-0', '0-1', '1/2-1/2'] }).notNull(),
  pgn: text('pgn').notNull(),
  whiteRatingBefore: integer('white_rating_before').notNull(),
  blackRatingBefore: integer('black_rating_before').notNull(),
  whiteRatingAfter: integer('white_rating_after').notNull(),
  blackRatingAfter: integer('black_rating_after').notNull(),
  finishedAt: integer('finished_at').notNull(),
}, (table) => [
  index('idx_games_white_finished').on(table.whiteId, table.finishedAt),
  index('idx_games_black_finished').on(table.blackId, table.finishedAt),
]);

export const matchReports = sqliteTable('match_reports', {
  roomCode: text('room_code').notNull(),
  reporterId: text('reporter_id').notNull(),
  reporterColor: text('reporter_color', { enum: ['w', 'b'] }).notNull(),
  result: text('result', { enum: ['1-0', '0-1', '1/2-1/2'] }).notNull(),
  pgn: text('pgn').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.roomCode, table.reporterId] }),
  index('idx_match_reports_room').on(table.roomCode),
]);

export const achievements = sqliteTable('achievements', {
  userId: text('user_id').notNull(),
  code: text('code').notNull(),
  unlockedAt: integer('unlocked_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.code] }),
]);

export const cosmeticUnlocks = sqliteTable('cosmetic_unlocks', {
  userId: text('user_id').notNull(),
  cosmeticCode: text('cosmetic_code').notNull(),
  grantedBy: text('granted_by'),
  acquiredAt: integer('acquired_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.cosmeticCode] }),
]);

export const moderationActions = sqliteTable('moderation_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminId: text('admin_id').notNull(),
  targetUserId: text('target_user_id'),
  roomCode: text('room_code'),
  action: text('action').notNull(),
  reason: text('reason').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_moderation_target_created').on(table.targetUserId, table.createdAt),
  index('idx_moderation_room_created').on(table.roomCode, table.createdAt),
]);

export const processedRewards = sqliteTable('processed_rewards', {
  idempotencyKey: text('idempotency_key').primaryKey(),
  userId: text('user_id').notNull(),
  rewardType: text('reward_type').notNull(),
  xp: integer('xp').notNull(),
  coins: integer('coins').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_processed_rewards_user_key').on(table.userId, table.idempotencyKey),
]);

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const communityMessages = sqliteTable('community_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  displayName: text('display_name').notNull(),
  avatarEmote: text('avatar_emote').notNull(),
  message: text('message').notNull(),
  roomCode: text('room_code'),
  scope: text('scope', { enum: ['community', 'room'] }).notNull().default('community'),
  createdAt: integer('created_at').notNull(),
  deletedAt: integer('deleted_at'),
  deletedBy: text('deleted_by'),
}, (table) => [
  index('idx_community_messages_created').on(table.createdAt),
  index('idx_community_messages_user_created').on(table.userId, table.createdAt),
]);

export const playerPresence = sqliteTable('player_presence', {
  visitorId: text('visitor_id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name').notNull(),
  roomCode: text('room_code'),
  mode: text('mode').notNull().default('menu'),
  firstSeenAt: integer('first_seen_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
}, (table) => [
  index('idx_presence_last_seen').on(table.lastSeenAt),
  index('idx_presence_user_id').on(table.userId),
]);

export const visitSessions = sqliteTable('visit_sessions', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull(),
  userId: text('user_id'),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_visit_sessions_created').on(table.createdAt)]);

export const friendships = sqliteTable('friendships', {
  pairKey: text('pair_key').primaryKey(),
  userA: text('user_a').notNull(),
  userB: text('user_b').notNull(),
  requestedBy: text('requested_by').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'blocked'] }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_friendships_user_a_status').on(table.userA, table.status),
  index('idx_friendships_user_b_status').on(table.userB, table.status),
]);

export const friendInvites = sqliteTable('friend_invites', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  recipientId: text('recipient_id').notNull(),
  roomCode: text('room_code').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'expired'] }).notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, (table) => [
  index('idx_friend_invites_recipient_status').on(table.recipientId, table.status, table.expiresAt),
]);

export const membershipInterest = sqliteTable('membership_interest', {
  userId: text('user_id').primaryKey(),
  status: text('status', { enum: ['interested', 'invited', 'activated'] }).notNull().default('interested'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
