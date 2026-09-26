CREATE TABLE `user_credentials` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
