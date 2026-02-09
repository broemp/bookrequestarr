-- Add user preference columns for quick request feature
ALTER TABLE users ADD COLUMN last_used_language TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN last_used_format TEXT CHECK(last_used_format IN ('ebook', 'audiobook'));
