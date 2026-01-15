import type { downloads, downloadStats } from '$lib/server/db/schema';

export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;

export type DownloadStats = typeof downloadStats.$inferSelect;
export type NewDownloadStats = typeof downloadStats.$inferInsert;

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';
export type SearchMethod = 'isbn' | 'title_author' | 'manual';

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
