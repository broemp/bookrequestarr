import { db } from './db';
import { settings } from './db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { env } from '$env/dynamic/private';

/**
 * Prowlarr API categories for different media types
 * See: https://wiki.servarr.com/prowlarr/cardigann-yml-definition#categories
 */
export const PROWLARR_CATEGORIES = {
	// Books: 7000-7999
	BOOKS: 7000,
	BOOKS_EBOOK: 7020,
	BOOKS_COMICS: 7030,
	BOOKS_MAGAZINES: 7010,
	BOOKS_TECHNICAL: 7040,
	BOOKS_FOREIGN: 7060,

	// Audio: 3000-3999 (for audiobooks)
	AUDIO: 3000,
	AUDIO_AUDIOBOOK: 3030
} as const;

/**
 * Prowlarr indexer information
 */
export interface ProwlarrIndexer {
	id: number;
	name: string;
	enable: boolean;
	protocol: 'usenet' | 'torrent';
	priority: number;
	categories: Array<{
		id: number;
		name: string;
	}>;
}

/**
 * Prowlarr search result
 */
export interface ProwlarrSearchResult {
	guid: string;
	indexerId: number;
	indexer: string;
	title: string;
	sortTitle?: string;
	size: number;
	downloadUrl?: string;
	infoUrl?: string;
	publishDate: string;
	categories: Array<{
		id: number;
		name: string;
	}>;
	protocol: 'usenet' | 'torrent';
	seeders?: number;
	leechers?: number;
	grabs?: number;
	age?: number;
	ageHours?: number;
	ageMinutes?: number;
}

/**
 * Configuration for Prowlarr
 */
export interface ProwlarrConfig {
	url: string;
	apiKey: string;
	enabled: boolean;
}

/**
 * Get Prowlarr URL from environment or database settings
 */
async function getProwlarrUrl(): Promise<string | null> {
	try {
		// First check environment variable
		if (env.PROWLARR_URL) {
			return env.PROWLARR_URL;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'prowlarr_url'))
			.limit(1);

		return setting?.value || null;
	} catch (error) {
		logger.error('Error fetching Prowlarr URL', error instanceof Error ? error : undefined);
		return null;
	}
}

/**
 * Get Prowlarr API key from environment or database settings
 */
async function getProwlarrApiKey(): Promise<string | null> {
	try {
		// First check environment variable
		if (env.PROWLARR_API_KEY) {
			return env.PROWLARR_API_KEY;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'prowlarr_api_key'))
			.limit(1);

		return setting?.value || null;
	} catch (error) {
		logger.error('Error fetching Prowlarr API key', error instanceof Error ? error : undefined);
		return null;
	}
}

/**
 * Check if Prowlarr is enabled in settings
 */
async function isProwlarrEnabled(): Promise<boolean> {
	try {
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'prowlarr_enabled'))
			.limit(1);

		return setting?.value === 'true';
	} catch (error) {
		logger.error(
			'Error checking if Prowlarr is enabled',
			error instanceof Error ? error : undefined
		);
		return false;
	}
}

/**
 * Get full Prowlarr configuration
 */
export async function getProwlarrConfig(): Promise<ProwlarrConfig | null> {
	const [url, apiKey, enabled] = await Promise.all([
		getProwlarrUrl(),
		getProwlarrApiKey(),
		isProwlarrEnabled()
	]);

	if (!url || !apiKey) {
		return null;
	}

	return {
		url: url.endsWith('/') ? url.slice(0, -1) : url,
		apiKey,
		enabled
	};
}

/**
 * Check if Prowlarr is configured and enabled
 */
export async function isProwlarrConfigured(): Promise<boolean> {
	const config = await getProwlarrConfig();
	return config !== null && config.enabled;
}

/**
 * Make an authenticated request to the Prowlarr API
 */
async function prowlarrFetch<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
	const config = await getProwlarrConfig();

	if (!config) {
		return { success: false, error: 'Prowlarr is not configured' };
	}

	const url = `${config.url}/api/v1${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'X-Api-Key': config.apiKey,
				'Content-Type': 'application/json',
				Accept: 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error('Prowlarr API request failed', undefined, {
				status: response.status,
				statusText: response.statusText,
				error: errorText,
				endpoint
			});
			return {
				success: false,
				error: `Prowlarr API error: ${response.status} ${response.statusText}`
			};
		}

		const data = await response.json();
		return { success: true, data };
	} catch (error) {
		logger.error('Prowlarr API request error', error instanceof Error ? error : undefined, {
			endpoint
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error connecting to Prowlarr'
		};
	}
}

/**
 * Test connection to Prowlarr
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
	logger.info('Testing Prowlarr connection');

	const result = await prowlarrFetch<{ version: string }>('/system/status');

	if (result.success) {
		logger.info('Prowlarr connection successful', { version: result.data?.version });
		return { success: true };
	}

	return { success: false, error: result.error };
}

/**
 * Get list of available indexers from Prowlarr
 */
export async function getIndexers(): Promise<{
	success: boolean;
	indexers?: ProwlarrIndexer[];
	error?: string;
}> {
	logger.info('Fetching Prowlarr indexers');

	const result = await prowlarrFetch<ProwlarrIndexer[]>('/indexer');

	if (!result.success) {
		return { success: false, error: result.error };
	}

	const indexers = result.data || [];
	logger.info('Fetched Prowlarr indexers', { count: indexers.length });

	return { success: true, indexers };
}

/**
 * Get enabled indexers that support book categories
 */
export async function getBookIndexers(): Promise<{
	success: boolean;
	indexers?: ProwlarrIndexer[];
	error?: string;
}> {
	const result = await getIndexers();

	if (!result.success) {
		return result;
	}

	// Filter to enabled indexers that have book categories
	const bookIndexers =
		result.indexers?.filter((indexer) => {
			if (!indexer.enable) return false;

			// Check if indexer supports any book category (7000-7999)
			return indexer.categories?.some((cat) => cat.id >= 7000 && cat.id < 8000);
		}) || [];

	logger.info('Filtered book indexers', {
		total: result.indexers?.length,
		bookIndexers: bookIndexers.length
	});

	return { success: true, indexers: bookIndexers };
}

/**
 * Get enabled indexers that support audiobook categories
 */
export async function getAudiobookIndexers(): Promise<{
	success: boolean;
	indexers?: ProwlarrIndexer[];
	error?: string;
}> {
	const result = await getIndexers();

	if (!result.success) {
		return result;
	}

	// Filter to enabled indexers that have audiobook category (3030)
	const audiobookIndexers =
		result.indexers?.filter((indexer) => {
			if (!indexer.enable) return false;

			return indexer.categories?.some((cat) => cat.id === PROWLARR_CATEGORIES.AUDIO_AUDIOBOOK);
		}) || [];

	logger.info('Filtered audiobook indexers', {
		total: result.indexers?.length,
		audiobookIndexers: audiobookIndexers.length
	});

	return { success: true, indexers: audiobookIndexers };
}

/**
 * Search Prowlarr for releases
 *
 * @param query - Search query (title, author, ISBN, etc.)
 * @param options - Search options
 * @returns Search results
 */
export async function search(
	query: string,
	options: {
		categories?: number[];
		indexerIds?: number[];
		limit?: number;
		type?: 'book' | 'audiobook';
	} = {}
): Promise<{
	success: boolean;
	results?: ProwlarrSearchResult[];
	error?: string;
}> {
	logger.info('Searching Prowlarr', { query, options });

	// Determine categories based on type or use provided categories
	let categories = options.categories;
	if (!categories) {
		if (options.type === 'audiobook') {
			categories = [PROWLARR_CATEGORIES.AUDIO_AUDIOBOOK];
		} else {
			// Default to book categories
			categories = [
				PROWLARR_CATEGORIES.BOOKS,
				PROWLARR_CATEGORIES.BOOKS_EBOOK,
				PROWLARR_CATEGORIES.BOOKS_TECHNICAL,
				PROWLARR_CATEGORIES.BOOKS_FOREIGN
			];
		}
	}

	// Build query parameters
	const params = new URLSearchParams();
	params.set('query', query);
	params.set('type', 'search');

	// Add categories
	for (const cat of categories) {
		params.append('categories', cat.toString());
	}

	// Add specific indexer IDs if provided
	if (options.indexerIds && options.indexerIds.length > 0) {
		for (const id of options.indexerIds) {
			params.append('indexerIds', id.toString());
		}
	}

	// Limit results
	if (options.limit) {
		params.set('limit', options.limit.toString());
	}

	const result = await prowlarrFetch<ProwlarrSearchResult[]>(`/search?${params.toString()}`);

	if (!result.success) {
		return { success: false, error: result.error };
	}

	const results = result.data || [];
	logger.info('Prowlarr search completed', { query, resultsCount: results.length });

	return { success: true, results };
}

/**
 * Search Prowlarr by ISBN
 */
export async function searchByIsbn(
	isbn: string,
	options: { type?: 'book' | 'audiobook'; indexerIds?: number[]; limit?: number } = {}
): Promise<{
	success: boolean;
	results?: ProwlarrSearchResult[];
	error?: string;
}> {
	// Clean ISBN (remove hyphens and spaces)
	const cleanIsbn = isbn.replace(/[-\s]/g, '');

	logger.info('Searching Prowlarr by ISBN', { isbn: cleanIsbn });

	return search(cleanIsbn, options);
}

/**
 * Search Prowlarr by title and author
 */
export async function searchByTitleAuthor(
	title: string,
	author: string,
	options: { type?: 'book' | 'audiobook'; indexerIds?: number[]; limit?: number } = {}
): Promise<{
	success: boolean;
	results?: ProwlarrSearchResult[];
	error?: string;
}> {
	const query = `${title} ${author}`.trim();

	logger.info('Searching Prowlarr by title and author', { title, author });

	return search(query, options);
}

/**
 * Get NZB download URL for a search result
 *
 * For Usenet results, returns the download URL for the NZB file.
 * This URL can be sent to SABnzbd for downloading.
 */
export function getNzbUrl(result: ProwlarrSearchResult): string | null {
	if (result.protocol !== 'usenet') {
		logger.warn('Cannot get NZB URL for non-Usenet result', {
			protocol: result.protocol,
			guid: result.guid
		});
		return null;
	}

	return result.downloadUrl || null;
}

/**
 * Filter search results to only include Usenet results
 */
export function filterUsenetResults(results: ProwlarrSearchResult[]): ProwlarrSearchResult[] {
	return results.filter((r) => r.protocol === 'usenet');
}

/**
 * Filter search results to only include torrent results
 */
export function filterTorrentResults(results: ProwlarrSearchResult[]): ProwlarrSearchResult[] {
	return results.filter((r) => r.protocol === 'torrent');
}

/**
 * Sort search results by relevance/quality
 *
 * Prioritizes:
 * 1. Larger file sizes (likely higher quality)
 * 2. More grabs (popularity indicator)
 * 3. More recent publish dates
 */
export function sortResultsByQuality(results: ProwlarrSearchResult[]): ProwlarrSearchResult[] {
	return [...results].sort((a, b) => {
		// Primary: size (larger is better for books/audiobooks)
		if (a.size !== b.size) {
			return b.size - a.size;
		}

		// Secondary: grabs (more grabs = more popular)
		const grabsA = a.grabs || 0;
		const grabsB = b.grabs || 0;
		if (grabsA !== grabsB) {
			return grabsB - grabsA;
		}

		// Tertiary: publish date (newer is better)
		return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
	});
}

/**
 * Extract book information from a Prowlarr search result title
 *
 * Attempts to parse common release naming conventions to extract:
 * - Title
 * - Author
 * - Year
 * - Format (EPUB, PDF, etc.)
 * - Language
 */
export function parseReleaseTitle(title: string): {
	title?: string;
	author?: string;
	year?: string;
	format?: string;
	language?: string;
} {
	const result: {
		title?: string;
		author?: string;
		year?: string;
		format?: string;
		language?: string;
	} = {};

	// Extract year (4 digits between 1900 and 2099)
	const yearMatch = title.match(/\b(19|20)\d{2}\b/);
	if (yearMatch) {
		result.year = yearMatch[0];
	}

	// Extract format (EPUB, PDF, MOBI, AZW3, etc.)
	const formatMatch = title.match(/\b(EPUB|PDF|MOBI|AZW3|DJVU|TXT|FB2|CBR|CBZ|MP3|M4B|FLAC)\b/i);
	if (formatMatch) {
		result.format = formatMatch[1].toUpperCase();
	}

	// Extract language (common language codes/names)
	const langMatch = title.match(
		/\b(English|Spanish|French|German|Italian|Portuguese|Russian|Chinese|Japanese|Korean|Dutch|Polish|Arabic|Hindi|Turkish|Swedish|Norwegian|Danish|Finnish)\b/i
	);
	if (langMatch) {
		result.language = langMatch[1];
	}

	// Try to extract author - common patterns:
	// "Title - Author (Year)"
	// "Author - Title"
	// "Title by Author"
	const byPattern = title.match(/(.+?)\s+by\s+(.+?)(?:\s*[\[(]|$)/i);
	if (byPattern) {
		result.title = byPattern[1].trim();
		result.author = byPattern[2].trim();
	} else {
		const dashPattern = title.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*[\[(]|$)/);
		if (dashPattern) {
			// Could be "Author - Title" or "Title - Author"
			// Heuristic: if first part has fewer words, it's likely the author
			const part1 = dashPattern[1].trim();
			const part2 = dashPattern[2].trim();
			const words1 = part1.split(/\s+/).length;
			const words2 = part2.split(/\s+/).length;

			if (words1 <= words2) {
				result.author = part1;
				result.title = part2;
			} else {
				result.title = part1;
				result.author = part2;
			}
		}
	}

	// Clean up extracted values
	if (result.title) {
		// Remove year, format, and other metadata from title
		result.title = result.title
			.replace(/\b(19|20)\d{2}\b/g, '')
			.replace(/\b(EPUB|PDF|MOBI|AZW3|DJVU|TXT|FB2|CBR|CBZ|MP3|M4B|FLAC)\b/gi, '')
			.replace(/\s*[\[(].*?[\])]\s*/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	if (result.author) {
		// Remove year and other metadata from author
		result.author = result.author
			.replace(/\b(19|20)\d{2}\b/g, '')
			.replace(/\s*[\[(].*?[\])]\s*/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	return result;
}
