-- Add Prowlarr/SABnzbd integration fields to downloads table
-- Makes annas_archive_md5 nullable (not required for Prowlarr downloads)
-- Adds download_source to track where the download came from
-- Adds SABnzbd tracking fields and confidence scoring

-- Step 1: Create new table with updated schema
CREATE TABLE IF NOT EXISTS downloads_new (
	id TEXT PRIMARY KEY NOT NULL,
	request_id TEXT NOT NULL,
	download_source TEXT DEFAULT 'annas_archive' NOT NULL CHECK(download_source IN ('prowlarr', 'annas_archive')),
	annas_archive_md5 TEXT,
	sabnzbd_nzo_id TEXT,
	nzb_name TEXT,
	indexer_name TEXT,
	confidence_score INTEGER,
	search_method TEXT NOT NULL CHECK(search_method IN ('isbn', 'title_author', 'manual')),
	file_type TEXT NOT NULL,
	file_path TEXT,
	file_size INTEGER,
	download_status TEXT DEFAULT 'pending' NOT NULL CHECK(download_status IN ('pending', 'downloading', 'completed', 'failed')),
	error_message TEXT,
	downloaded_at INTEGER,
	created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);--> statement-breakpoint

-- Step 2: Copy existing data (all existing records are annas_archive)
INSERT INTO downloads_new (
	id, request_id, download_source, annas_archive_md5,
	search_method, file_type, file_path, file_size,
	download_status, error_message, downloaded_at, created_at
)
SELECT 
	id, request_id, 'annas_archive', annas_archive_md5,
	search_method, file_type, file_path, file_size,
	download_status, error_message, downloaded_at, created_at
FROM downloads;--> statement-breakpoint

-- Step 3: Drop old table
DROP TABLE downloads;--> statement-breakpoint

-- Step 4: Rename new table to original name
ALTER TABLE downloads_new RENAME TO downloads;--> statement-breakpoint

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS downloads_request_id_idx ON downloads(request_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS downloads_status_idx ON downloads(download_status);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS downloads_source_idx ON downloads(download_source);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS downloads_sabnzbd_nzo_id_idx ON downloads(sabnzbd_nzo_id);
