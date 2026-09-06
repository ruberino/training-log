CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` integer NOT NULL,
	`date` text NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "entries_weight_kg_check" CHECK("entries"."weight_kg" is null or ("entries"."weight_kg" >= 0 and "entries"."weight_kg" < 1000)),
	CONSTRAINT "entries_reps_check" CHECK("entries"."reps" is null or ("entries"."reps" > 0 and "entries"."reps" < 1000))
);
--> statement-breakpoint
CREATE INDEX `entries_exercise_date` ON `entries` (`exercise_id`,"date" desc,"id" desc);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`metric` text DEFAULT 'weight' NOT NULL,
	`created_at` text NOT NULL,
	`archived_at` text,
	CONSTRAINT "exercises_metric_check" CHECK("exercises"."metric" in ('weight', 'reps'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_normalized_unique` ON `exercises` (`name_normalized`);