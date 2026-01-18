import type { downloads, downloadStats } from '$lib/server/db/schema';

export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;

export type DownloadStats = typeof downloadStats.$inferSelect;
export type NewDownloadStats = typeof downloadStats.$inferInsert;

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';
export type SearchMethod = 'isbn' | 'title_author' | 'manual';
export type DownloadSource = 'prowlarr' | 'annas_archive';

/**
 * Download source priority setting values
 * Controls the order in which download sources are tried
 */
export type DownloadSourcePriority =
	| 'prowlarr_first' // Try Prowlarr, fallback to Anna's Archive
	| 'annas_archive_first' // Try Anna's Archive, fallback to Prowlarr
	| 'prowlarr_only' // Only use Prowlarr
	| 'annas_archive_only'; // Only use Anna's Archive

/**
 * Settings keys for Prowlarr/SABnzbd integration
 */
export const DOWNLOAD_SETTINGS_KEYS = {
	// Prowlarr settings
	PROWLARR_URL: 'prowlarr_url',
	PROWLARR_API_KEY: 'prowlarr_api_key',
	PROWLARR_BOOK_CATEGORY: 'prowlarr_book_category',
	PROWLARR_AUDIOBOOK_CATEGORY: 'prowlarr_audiobook_category',
	// SABnzbd settings
	SABNZBD_URL: 'sabnzbd_url',
	SABNZBD_API_KEY: 'sabnzbd_api_key',
	SABNZBD_CATEGORY: 'sabnzbd_category',
	// Download orchestration settings
	DOWNLOAD_SOURCE_PRIORITY: 'download_source_priority',
	MIN_CONFIDENCE_SCORE: 'min_confidence_score', // Default: 50
	// Feature flags
	PROWLARR_ENABLED: 'prowlarr_enabled',
	SABNZBD_ENABLED: 'sabnzbd_enabled'
} as const;

/**
 * Default values for new settings
 */
export const DOWNLOAD_SETTINGS_DEFAULTS: Record<string, string> = {
	[DOWNLOAD_SETTINGS_KEYS.DOWNLOAD_SOURCE_PRIORITY]: 'prowlarr_first',
	[DOWNLOAD_SETTINGS_KEYS.MIN_CONFIDENCE_SCORE]: '50',
	[DOWNLOAD_SETTINGS_KEYS.PROWLARR_BOOK_CATEGORY]: '7000',
	[DOWNLOAD_SETTINGS_KEYS.PROWLARR_AUDIOBOOK_CATEGORY]: '3000',
	[DOWNLOAD_SETTINGS_KEYS.SABNZBD_CATEGORY]: 'books',
	[DOWNLOAD_SETTINGS_KEYS.PROWLARR_ENABLED]: 'false',
	[DOWNLOAD_SETTINGS_KEYS.SABNZBD_ENABLED]: 'false'
};

export interface AnnasArchiveSearchResult {
	md5: string;
	title: string;
	author: string;
	publisher?: string;
	year?: string;
	language?: string;
	filesize?: number;
	extension?: string;
	cover_url?: string;
}

export interface AnnasArchiveFileInfo {
	md5: string;
	title: string;
	author: string;
	extension: string;
	filesize: number;
	filesize_reported?: number;
	language?: string;
	publisher?: string;
	year?: string;
	pages?: number;
	description?: string;
	cover_url?: string;
	download_urls?: Array<{
		path_index: number;
		domain_index: number;
		domain_name: string;
	}>;
}

export interface AnnasArchiveFastDownloadResponse {
	download_url: string | null;
	error?: string;
	account_fast_download_info?: {
		downloads_left: number;
		downloads_total: number;
		time_window_hours: number;
	};
}

export interface DownloadWithRequest extends Download {
	request: {
		id: string;
		bookId: string;
		userId: string;
		status: string;
		language?: string;
	};
}

/**
 * Prowlarr search result from /api/v1/search
 */
export interface ProwlarrSearchResult {
	guid: string;
	indexerId: number;
	indexer: string;
	title: string;
	sortTitle?: string;
	categories: Array<{
		id: number;
		name: string;
	}>;
	size: number;
	downloadUrl?: string;
	infoUrl?: string;
	publishDate: string;
	seeders?: number;
	leechers?: number;
	protocol: string; // 'usenet' | 'torrent'
	age?: number;
	grabs?: number;
	// Parsed metadata (may be available depending on indexer)
	author?: string;
	bookTitle?: string;
	publisher?: string;
	year?: number;
}

/**
 * SABnzbd queue slot from mode=queue
 */
export interface SABnzbdQueueSlot {
	nzo_id: string;
	filename: string;
	status: string; // 'Downloading', 'Queued', 'Paused', etc.
	mb: string; // Total size in MB
	mbleft: string; // Remaining MB
	percentage: string;
	eta: string;
	timeleft: string;
	cat: string; // Category
}

/**
 * SABnzbd history slot from mode=history
 */
export interface SABnzbdHistorySlot {
	nzo_id: string;
	name: string;
	status: string; // 'Completed', 'Failed', etc.
	bytes: number;
	storage: string; // Final storage path
	completed: number; // Unix timestamp
	fail_message?: string;
	category: string;
}

/**
 * SABnzbd add URL response
 */
export interface SABnzbdAddResponse {
	status: boolean;
	nzo_ids?: string[];
	error?: string;
}

/**
 * Result from confidence score matching
 */
export interface MatchResult {
	result: ProwlarrSearchResult;
	confidenceScore: number;
	matchDetails: {
		isbnMatch: boolean;
		titleSimilarity: number;
		authorMatch: boolean;
		yearMatch: boolean;
		languageMatch: boolean;
	};
}
