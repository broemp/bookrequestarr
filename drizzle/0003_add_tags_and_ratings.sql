-- Add new columns to books table
ALTER TABLE books ADD COLUMN rating TEXT;
ALTER TABLE books ADD COLUMN rating_count INTEGER;

-- Remove genres column (will be replaced with tags table)
-- SQLite doesn't support DROP COLUMN in older versions, so we'll leave it for now
-- It will just be unused

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
	id TEXT PRIMARY KEY NOT NULL,
	hardcover_tag_id TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	category TEXT,
	created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Create book_tags junction table
CREATE TABLE IF NOT EXISTS book_tags (
	id TEXT PRIMARY KEY NOT NULL,
	book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
	tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

