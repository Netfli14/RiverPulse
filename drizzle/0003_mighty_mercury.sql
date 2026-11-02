CREATE TABLE `portal_records` (
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`collection`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_portal_collection_time` ON `portal_records` (`collection`,`created_at`);