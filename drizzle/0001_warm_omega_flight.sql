CREATE TABLE `body_weight` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`weight_kg` real NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	CONSTRAINT "body_weight_weight_kg_check" CHECK("body_weight"."weight_kg" > 0 and "body_weight"."weight_kg" < 500)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_weight_date_unique` ON `body_weight` (`date`);