-- Add autoDownloadEnabled column to users table
ALTER TABLE users ADD COLUMN auto_download_enabled INTEGER DEFAULT 0 NOT NULL;

-- Update requests status enum to include 'download_problem'
-- Note: SQLite doesn't support ALTER COLUMN, so we'll handle this in the application layer

-- Create downloads table
CREATE TABLE IF NOT EXISTS downloads (
	id TEXT PRIMARY KEY NOT NULL,
	request_id TEXT NOT NULL,
	annas_archive_md5 TEXT NOT NULL,
	search_method TEXT NOT NULL CHECK(search_method IN ('isbn', 'title_author', 'manual')),
	file_type TEXT NOT NULL,
	file_path TEXT,
	file_size INTEGER,
	download_status TEXT DEFAULT 'pending' NOT NULL CHECK(download_status IN ('pending', 'downloading', 'completed', 'failed')),
	error_message TEXT,
	downloaded_at INTEGER,
	created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Create download_stats table
CREATE TABLE IF NOT EXISTS download_stats (
	id TEXT PRIMARY KEY NOT NULL,
	date TEXT NOT NULL UNIQUE,
	download_count INTEGER DEFAULT 0 NOT NULL,
	created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS downloads_request_id_idx ON downloads(request_id);
CREATE INDEX IF NOT EXISTS downloads_status_idx ON downloads(download_status);
CREATE INDEX IF NOT EXISTS download_stats_date_idx ON download_stats(date);

