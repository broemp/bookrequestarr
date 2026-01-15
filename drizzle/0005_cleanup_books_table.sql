-- Clean up unused fields from books table
-- SQLite doesn't support DROP COLUMN, so we need to recreate the table

-- Create new books table with only the fields we use
CREATE TABLE books_new (
	id TEXT PRIMARY KEY NOT NULL,
	hardcover_id TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	description TEXT,
	cover_image TEXT,
	isbn_13 TEXT,
	isbn_10 TEXT,
	publish_date TEXT,
	pages INTEGER,
	publisher TEXT,
	rating TEXT,
	rating_count INTEGER,
	cached_at INTEGER DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
-- Copy data from old table to new table
INSERT INTO books_new (
	id, hardcover_id, title, description, cover_image, 
	isbn_13, isbn_10, publish_date, pages, publisher, 
	rating, rating_count, cached_at
)
SELECT 
	id, hardcover_id, title, description, cover_image,
	isbn_13, isbn_10, publish_date, pages, publisher,
	rating, rating_count, cached_at
FROM books;--> statement-breakpoint
-- Drop old table
DROP TABLE books;--> statement-breakpoint
-- Rename new table to books
ALTER TABLE books_new RENAME TO books;--> statement-breakpoint
-- Recreate the unique index
CREATE UNIQUE INDEX books_hardcover_id_unique ON books (hardcover_id);

