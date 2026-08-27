CREATE TABLE `users_table` (
	`id` text(22) PRIMARY KEY,
	`key` text(86) NOT NULL UNIQUE,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`expiration` integer,
	`revoked` integer NOT NULL
);
