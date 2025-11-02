-- Create authors table
CREATE TABLE IF NOT EXISTS `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`hardcover_author_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Create book_authors junction table
CREATE TABLE IF NOT EXISTS `book_authors` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Add unique constraint to hardcover_author_id
CREATE UNIQUE INDEX IF NOT EXISTS `authors_hardcover_author_id_unique` ON `authors` (`hardcover_author_id`);

-- Rename isbn to isbn_13 and add isbn_10
ALTER TABLE `books` RENAME COLUMN `isbn` TO `isbn_13`;
ALTER TABLE `books` ADD COLUMN `isbn_10` text;

-- Drop the old author and genres columns (they'll be replaced with junction tables)
-- Note: SQLite doesn't support DROP COLUMN directly, so we'll keep them for now
-- and just not use them. They can be removed in a future migration with table recreation.

