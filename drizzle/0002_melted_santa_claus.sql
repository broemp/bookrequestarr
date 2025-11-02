CREATE TABLE `api_cache` (
	`request_hash` text PRIMARY KEY NOT NULL,
	`request_data` text NOT NULL,
	`response_data` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
