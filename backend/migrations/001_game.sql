CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `friends` (
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`from_id`, `to_id`)
);
--> statement-breakpoint
CREATE TABLE `practice` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`day` text NOT NULL,
	`choice` integer NOT NULL,
	`confidence` integer NOT NULL,
	`score` real NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`choice` integer NOT NULL,
	`confidence` integer NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`score` real,
	`seen` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`position` integer NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`context` text NOT NULL,
	`options` text NOT NULL,
	`close_at` text NOT NULL,
	`resolve_at` text NOT NULL,
	`source` text NOT NULL,
	`source_url` text NOT NULL,
	`rule` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`outcome` integer,
	`evidence` text,
	`resolved_at` text,
	`checked_at` text
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created` text NOT NULL,
	`preferences` text DEFAULT '{}' NOT NULL,
	`onboarded` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_code_unique` ON `users` (`code`);