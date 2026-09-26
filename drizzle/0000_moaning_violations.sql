CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`station_id` text,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`explanation` text,
	`model_confidence` real,
	`status` text NOT NULL,
	`detected_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `monitoring_stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cleanup_events` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text,
	`water_body_id` text,
	`collected_kg` real NOT NULL,
	`categories_json` text NOT NULL,
	`before_object_key` text,
	`after_object_key` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`route_id`) REFERENCES `robot_routes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`water_body_id`) REFERENCES `water_bodies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text,
	`water_body_id` text,
	`status` text NOT NULL,
	`assigned_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`water_body_id`) REFERENCES `water_bodies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lab_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`water_body_id` text NOT NULL,
	`sampled_at` integer NOT NULL,
	`laboratory` text NOT NULL,
	`result_json` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`water_body_id`) REFERENCES `water_bodies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` text NOT NULL,
	`parameter` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`measured_at` integer NOT NULL,
	`confidence` real,
	`source` text NOT NULL,
	`calibration_status` text NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `monitoring_stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_measurements_station_time` ON `measurements` (`station_id`,`measured_at`);--> statement-breakpoint
CREATE TABLE `monitoring_stations` (
	`id` text PRIMARY KEY NOT NULL,
	`water_body_id` text NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`status` text NOT NULL,
	`last_calibration_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`water_body_id`) REFERENCES `water_bodies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_stations_water_body` ON `monitoring_stations` (`water_body_id`);--> statement-breakpoint
CREATE INDEX `idx_stations_status` ON `monitoring_stations` (`status`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `robot_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`robot_id` text NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`distance_km` real,
	`route_geo_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`robot_id`) REFERENCES `robots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_routes_robot` ON `robot_routes` (`robot_id`);--> statement-breakpoint
CREATE TABLE `robots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`battery` integer,
	`container_fill` integer,
	`latitude` real,
	`longitude` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`observed_at` integer NOT NULL,
	`photo_object_key` text,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reports_user` ON `user_reports` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_reports_status` ON `user_reports` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`language` text DEFAULT 'ru' NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `water_bodies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`kind` text NOT NULL,
	`center_lat` real,
	`center_lng` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
