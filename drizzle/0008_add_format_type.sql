-- Add format_type column to requests table for audiobook support
ALTER TABLE requests ADD COLUMN format_type TEXT DEFAULT 'ebook' NOT NULL;
