CREATE TABLE IF NOT EXISTS `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`hardcover_author_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `book_authors` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `authors_hardcover_author_id_unique` ON `authors` (`hardcover_author_id`);--> statement-breakpoint
ALTER TABLE `books` RENAME COLUMN `isbn` TO `isbn_13`;--> statement-breakpoint
ALTER TABLE `books` ADD COLUMN `isbn_10` text;
