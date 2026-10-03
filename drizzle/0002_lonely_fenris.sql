CREATE TABLE `robot_telemetry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`robot_id` text NOT NULL,
	`payload` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_robot_telemetry_time` ON `robot_telemetry` (`robot_id`,`received_at`);