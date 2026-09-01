CREATE TABLE IF NOT EXISTS `profiles` (
  `user_id` text PRIMARY KEY NOT NULL, `display_name` text NOT NULL, `avatar_emote` text DEFAULT '♘' NOT NULL,
  `profile_title` text DEFAULT 'Desafiante' NOT NULL, `board_theme` text DEFAULT 'emerald' NOT NULL,
  `piece_theme` text DEFAULT 'classic' NOT NULL, `rating` integer DEFAULT 1200 NOT NULL,
  `peak_rating` integer DEFAULT 1200 NOT NULL, `games` integer DEFAULT 0 NOT NULL, `wins` integer DEFAULT 0 NOT NULL,
  `draws` integer DEFAULT 0 NOT NULL, `losses` integer DEFAULT 0 NOT NULL, `win_streak` integer DEFAULT 0 NOT NULL,
  `longest_streak` integer DEFAULT 0 NOT NULL, `coins` integer DEFAULT 100 NOT NULL, `xp` integer DEFAULT 0 NOT NULL,
  `level` integer DEFAULT 1 NOT NULL, `banned_until` integer, `ban_reason` text, `chat_muted_until` integer,
  `chat_mute_reason` text, `membership_tier` text DEFAULT 'free' NOT NULL, `member_since` integer,
  `member_until` integer, `created_at` integer NOT NULL, `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_profiles_rating` ON `profiles` (`rating`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_profiles_banned_until` ON `profiles` (`banned_until`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rooms` (`code` text PRIMARY KEY NOT NULL, `host_id` text NOT NULL, `guest_id` text, `status` text NOT NULL, `created_at` integer NOT NULL, `last_seen_at` integer NOT NULL, `matchmaking` integer DEFAULT 0 NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_rooms_status_last_seen` ON `rooms` (`status`,`last_seen_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_rooms_host_id` ON `rooms` (`host_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `games` (`id` text PRIMARY KEY NOT NULL, `room_code` text, `white_id` text NOT NULL, `black_id` text NOT NULL, `result` text NOT NULL, `pgn` text NOT NULL, `white_rating_before` integer NOT NULL, `black_rating_before` integer NOT NULL, `white_rating_after` integer NOT NULL, `black_rating_after` integer NOT NULL, `finished_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_games_white_finished` ON `games` (`white_id`,`finished_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_games_black_finished` ON `games` (`black_id`,`finished_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `match_reports` (`room_code` text NOT NULL, `reporter_id` text NOT NULL, `reporter_color` text NOT NULL, `result` text NOT NULL, `pgn` text NOT NULL, `created_at` integer NOT NULL, PRIMARY KEY(`room_code`,`reporter_id`));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_match_reports_room` ON `match_reports` (`room_code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `achievements` (`user_id` text NOT NULL, `code` text NOT NULL, `unlocked_at` integer NOT NULL, PRIMARY KEY(`user_id`,`code`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cosmetic_unlocks` (`user_id` text NOT NULL, `cosmetic_code` text NOT NULL, `granted_by` text, `acquired_at` integer NOT NULL, PRIMARY KEY(`user_id`,`cosmetic_code`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `moderation_actions` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `admin_id` text NOT NULL, `target_user_id` text, `room_code` text, `action` text NOT NULL, `reason` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_moderation_target_created` ON `moderation_actions` (`target_user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_moderation_room_created` ON `moderation_actions` (`room_code`,`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `processed_rewards` (`idempotency_key` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `reward_type` text NOT NULL, `xp` integer NOT NULL, `coins` integer NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_processed_rewards_user_key` ON `processed_rewards` (`user_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `app_settings` (`key` text PRIMARY KEY NOT NULL, `value` text NOT NULL, `updated_by` text NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `community_messages` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `user_id` text NOT NULL, `display_name` text NOT NULL, `avatar_emote` text NOT NULL, `message` text NOT NULL, `room_code` text, `scope` text DEFAULT 'community' NOT NULL, `created_at` integer NOT NULL, `deleted_at` integer, `deleted_by` text);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_community_messages_created` ON `community_messages` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_community_messages_user_created` ON `community_messages` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `friendships` (`pair_key` text PRIMARY KEY NOT NULL, `user_a` text NOT NULL, `user_b` text NOT NULL, `requested_by` text NOT NULL, `status` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_friendships_user_a_status` ON `friendships` (`user_a`,`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_friendships_user_b_status` ON `friendships` (`user_b`,`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `friend_invites` (`id` text PRIMARY KEY NOT NULL, `sender_id` text NOT NULL, `recipient_id` text NOT NULL, `room_code` text NOT NULL, `status` text NOT NULL, `created_at` integer NOT NULL, `expires_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_friend_invites_recipient_status` ON `friend_invites` (`recipient_id`,`status`,`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `membership_interest` (`user_id` text PRIMARY KEY NOT NULL, `status` text DEFAULT 'interested' NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `player_presence` (`visitor_id` text PRIMARY KEY NOT NULL, `user_id` text, `display_name` text NOT NULL, `room_code` text, `mode` text DEFAULT 'menu' NOT NULL, `first_seen_at` integer NOT NULL, `last_seen_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_presence_last_seen` ON `player_presence` (`last_seen_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_presence_user_id` ON `player_presence` (`user_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `visit_sessions` (`id` text PRIMARY KEY NOT NULL, `visitor_id` text NOT NULL, `user_id` text, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_visit_sessions_created` ON `visit_sessions` (`created_at`);
--> statement-breakpoint
PRAGMA optimize;
