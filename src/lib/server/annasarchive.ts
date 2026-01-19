import { db } from './db';
import { settings, downloadStats } from './db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import type {
	AnnasArchiveSearchResult,
	AnnasArchiveFileInfo,
	AnnasArchiveFastDownloadResponse
} from '$lib/types/download';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { env } from '$env/dynamic/private';
import * as cheerio from 'cheerio';

/**
 * List of Anna's Archive domains to try (in order of preference)
 * These domains are rotated automatically if one is blocked or unavailable
 */
const ANNAS_ARCHIVE_DOMAINS = ['annas-archive.li', 'annas-archive.pm', 'annas-archive.in'];

/**
 * Get list of Anna's Archive domains to try
 * Allows custom domain via environment variable or database settings
 */
async function getDomains(): Promise<string[]> {
	try {
		// Check for custom domain in environment variable
		if (env.ANNAS_ARCHIVE_DOMAIN) {
			// If custom domain is set, try it first, then fall back to defaults
			return [env.ANNAS_ARCHIVE_DOMAIN, ...ANNAS_ARCHIVE_DOMAINS];
		}

		// Check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'annas_archive_domain'))
			.limit(1);

		if (setting?.value) {
			// If custom domain is set, try it first, then fall back to defaults
			return [setting.value, ...ANNAS_ARCHIVE_DOMAINS];
		}

		return ANNAS_ARCHIVE_DOMAINS;
	} catch (error) {
		logger.error(
			"Error fetching Anna's Archive domains",
			error instanceof Error ? error : undefined
		);
		return ANNAS_ARCHIVE_DOMAINS;
	}
}

/**
 * Try fetching from multiple domains until one succeeds
 */
async function fetchWithDomainFallback(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	const domains = await getDomains();
	const errors: Array<{ domain: string; error: string }> = [];

	for (const domain of domains) {
		const url = `https://${domain}${path}`;
		let timeout: NodeJS.Timeout | undefined;
		
		try {
			logger.debug('Attempting to fetch from Anna\'s Archive', { domain, path });
			
			const controller = new AbortController();
			timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

			const response = await fetch(url, {
				...options,
				signal: controller.signal,
				headers: {
					'User-Agent': 'Bookrequestarr/1.0',
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					...options.headers
				}
			});

			clearTimeout(timeout);

			if (response.ok) {
				logger.info('Successfully connected to Anna\'s Archive', { domain });
				return response;
			}

			// Non-OK response, try next domain
			errors.push({
				domain,
				error: `HTTP ${response.status} ${response.statusText}`
			});
			logger.warn('Anna\'s Archive domain returned error, trying next', {
				domain,
				status: response.status
			});
		} catch (error) {
			if (timeout) {
				clearTimeout(timeout);
			}
			
			const errorMessage = error instanceof Error ? error.message : String(error);
			errors.push({ domain, error: errorMessage });
			
			logger.warn('Failed to connect to Anna\'s Archive domain, trying next', {
				domain,
				error: errorMessage
			});
		}
	}

	// All domains failed
	const errorSummary = errors.map((e) => `${e.domain}: ${e.error}`).join('; ');
	throw new Error(
		`All Anna's Archive domains failed. Tried: ${errorSummary}. The service may be down or blocked by your network.`
	);
}

/**
 * Get Anna's Archive API key from settings or environment
 */
async function getApiKey(): Promise<string | null> {
	try {
		// First check environment variable
		if (env.ANNAS_ARCHIVE_API_KEY) {
			return env.ANNAS_ARCHIVE_API_KEY;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'annas_archive_api_key'))
			.limit(1);

		return setting?.value || null;
	} catch (error) {
		logger.error(
			"Error fetching Anna's Archive API key",
			error instanceof Error ? error : undefined
		);
		return null;
	}
}

/**
 * Check if Anna's Archive API key is configured
 */
export async function isApiKeyConfigured(): Promise<boolean> {
	const apiKey = await getApiKey();
	return apiKey !== null && apiKey.length > 0;
}

/**
 * Get daily download limit from settings
 */
async function getDailyLimit(): Promise<number> {
	try {
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_daily_limit'))
			.limit(1);

		if (setting?.value) {
			const limit = parseInt(setting.value, 10);
			if (!isNaN(limit) && limit > 0) {
				return limit;
			}
		}
	} catch (error) {
		logger.error('Error fetching daily download limit', error instanceof Error ? error : undefined);
	}

	return 25; // Default limit
}

/**
 * Get today's download count
 */
async function getTodayDownloadCount(): Promise<number> {
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	try {
		const [stat] = await db
			.select()
			.from(downloadStats)
			.where(eq(downloadStats.date, today))
			.limit(1);

		return stat?.downloadCount || 0;
	} catch (error) {
		logger.error(
			"Error fetching today's download count",
			error instanceof Error ? error : undefined
		);
		return 0;
	}
}

/**
 * Check if we can download today (haven't reached daily limit)
 */
export async function canDownloadToday(): Promise<{
	allowed: boolean;
	current: number;
	limit: number;
}> {
	const limit = await getDailyLimit();
	const current = await getTodayDownloadCount();

	return {
		allowed: current < limit,
		current,
		limit
	};
}

/**
 * Parse search results from Anna's Archive HTML
 */
function parseSearchResults(html: string): AnnasArchiveSearchResult[] {
	const $ = cheerio.load(html);
	const results: AnnasArchiveSearchResult[] = [];
	const seenMd5s = new Set<string>();

	// Find all cover image links (these are the first link for each result)
	$('a.custom-a.block[href^="/md5/"]').each((_, element) => {
		const href = $(element).attr('href');
		if (!href) return;

		const md5Match = href.match(/\/md5\/([a-f0-9]{32})/);
		if (!md5Match) return;

		const md5 = md5Match[1];

		// Skip duplicates
		if (seenMd5s.has(md5)) return;
		seenMd5s.add(md5);

		// The structure is: <a> for cover, then sibling <div class="max-w-full..."> with details
		const coverLink = $(element);
		const detailsContainer = coverLink.next('div');

		if (!detailsContainer.length) return;

		// Extract title (link with font-semibold class)
		const titleLink = detailsContainer.find('a.font-semibold').first();
		const title = titleLink.text().trim();

		if (!title) return; // Skip if no title found

		// Extract author (link with icon-[mdi--user-edit])
		const authorLink = detailsContainer
			.find('a')
			.filter((_, el) => {
				return $(el).find('[class*="icon-"][class*="mdi--user-edit"]').length > 0;
			})
			.first();
		const authorText = authorLink.text().trim();
		const author = authorText.replace(/^\s*/, '').trim(); // Clean up whitespace

		// Extract publisher and year (link with icon-[mdi--company])
		const publisherLink = detailsContainer
			.find('a')
			.filter((_, el) => {
				return $(el).find('[class*="icon-"][class*="mdi--company"]').length > 0;
			})
			.first();
		const publisherText = publisherLink.text().trim();

		// Parse publisher text which might be like "Publisher, Series, Year"
		let publisher = '';
		let year = '';
		if (publisherText) {
			const parts = publisherText.split(',').map((p) => p.trim());
			if (parts.length > 0) {
				publisher = parts[0].replace(/^\s*/, '').trim();
			}
			// Try to find year (4 digits)
			const yearMatch = publisherText.match(/\b(19|20)\d{2}\b/);
			if (yearMatch) {
				year = yearMatch[0];
			}
		}

		// Extract file metadata from div with text-gray-800 class (format: "English [en] · EPUB · 0.3MB · 2017")
		const metadataDiv = detailsContainer.find('div[class*="text-gray-800"]').first();
		const metadataText = metadataDiv.text().trim();

		// Extract language (format: "English [en]")
		const langMatch = metadataText.match(
			/(English|Spanish|French|German|Italian|Portuguese|Russian|Chinese|Japanese|Korean|Dutch|Polish|Arabic|Hindi|Turkish)\s*\[([a-z]{2})\]/i
		);
		const language = langMatch ? langMatch[1] : '';

		// Extract file extension (EPUB, PDF, MOBI, etc.)
		const extMatch = metadataText.match(/\b(EPUB|PDF|MOBI|AZW3|DJVU|TXT|FB2|CBR|CBZ)\b/i);
		const extension = extMatch ? extMatch[1].toLowerCase() : '';

		// Extract file size (format: "0.3MB", "1.2GB", "500KB")
		const sizeMatch = metadataText.match(/(\d+(?:\.\d+)?)\s*(MB|KB|GB)/i);
		let filesize = 0;
		if (sizeMatch) {
			const size = parseFloat(sizeMatch[1]);
			const unit = sizeMatch[2].toUpperCase();
			if (unit === 'KB') {
				filesize = Math.round(size * 1024);
			} else if (unit === 'MB') {
				filesize = Math.round(size * 1024 * 1024);
			} else if (unit === 'GB') {
				filesize = Math.round(size * 1024 * 1024 * 1024);
			}
		}

		// If year not found in publisher, try metadata
		if (!year) {
			const yearMatch = metadataText.match(/\b(19|20)\d{2}\b/);
			if (yearMatch) {
				year = yearMatch[0];
			}
		}

		results.push({
			md5,
			title,
			author: author || '',
			publisher,
			year,
			language,
			filesize,
			extension,
			cover_url: undefined
		});
	});

	return results;
}

/**
 * Search Anna's Archive by ISBN
 */
export async function searchByIsbn(isbn: string): Promise<AnnasArchiveSearchResult[]> {
	// Clean ISBN (remove hyphens and spaces)
	const cleanIsbn = isbn.replace(/[-\s]/g, '');

	logger.info("Searching Anna's Archive by ISBN", { isbn: cleanIsbn });

	try {
		// First try with fast download filter
		const paramsWithFast = new URLSearchParams({
			q: cleanIsbn,
			acc: 'aa_download' // Filter for files with fast download available
		});

		let response = await fetchWithDomainFallback(`/search?${paramsWithFast}`);
		let html = await response.text();
		let results = parseSearchResults(html);

		// If no results with fast download filter, try without it
		if (results.length === 0) {
			logger.info("No fast download results, searching all files", { isbn: cleanIsbn });
			const params = new URLSearchParams({
				q: cleanIsbn
			});

			response = await fetchWithDomainFallback(`/search?${params}`);
			html = await response.text();
			results = parseSearchResults(html);
		}

		logger.info("Anna's Archive ISBN search completed", {
			isbn: cleanIsbn,
			resultsCount: results.length
		});
		return results;
	} catch (error) {
		logger.error(
			"Error searching Anna's Archive by ISBN",
			error instanceof Error ? error : undefined,
			{ isbn: cleanIsbn }
		);
		throw error;
	}
}

/**
 * Search Anna's Archive by title and author
 */
export async function searchByTitleAuthor(
	title: string,
	author: string
): Promise<AnnasArchiveSearchResult[]> {
	logger.info("Searching Anna's Archive by title and author", { title, author });

	try {
		const query = `${title} ${author}`.trim();
		
		// First try with fast download filter
		const paramsWithFast = new URLSearchParams({
			q: query,
			acc: 'aa_download' // Filter for files with fast download available
		});

		let response = await fetchWithDomainFallback(`/search?${paramsWithFast}`);
		let html = await response.text();
		let results = parseSearchResults(html);

		// If no results with fast download filter, try without it
		if (results.length === 0) {
			logger.info("No fast download results, searching all files", { title, author });
			const params = new URLSearchParams({
				q: query
			});

			response = await fetchWithDomainFallback(`/search?${params}`);
			html = await response.text();
			results = parseSearchResults(html);
		}

		logger.info("Anna's Archive title/author search completed", {
			title,
			author,
			resultsCount: results.length
		});
		return results;
	} catch (error) {
		logger.error(
			"Error searching Anna's Archive by title/author",
			error instanceof Error ? error : undefined,
			{ title, author }
		);
		throw error;
	}
}

/**
 * Get available file formats and download options for a specific MD5
 */
export async function getAvailableFiles(md5: string): Promise<AnnasArchiveFileInfo | null> {
	logger.info("Getting available files from Anna's Archive", { md5 });

	try {
		const response = await fetchWithDomainFallback(`/md5/${md5}`);
		const html = await response.text();
		const $ = cheerio.load(html);

		// Extract file information from the page
		const title = $('h1').first().text().trim() || '';
		const author = $('div:contains("Author")').next().text().trim() || '';

		// Extract extension from the download links or file info
		const extensionMatch = html.match(/\.(epub|pdf|mobi|azw3|djvu|txt|fb2)\b/i);
		const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

		// Extract file size
		const sizeMatch = html.match(/(\d+(?:\.\d+)?)\s*(MB|KB|GB)/i);
		let filesize = 0;
		if (sizeMatch) {
			const size = parseFloat(sizeMatch[1]);
			const unit = sizeMatch[2].toUpperCase();
			if (unit === 'KB') {
				filesize = Math.round(size * 1024);
			} else if (unit === 'MB') {
				filesize = Math.round(size * 1024 * 1024);
			} else if (unit === 'GB') {
				filesize = Math.round(size * 1024 * 1024 * 1024);
			}
		}

	// Extract download URLs with path_index and domain_index
		// Look for fast download links in the format: /fast_download/{md5}/{path_index}/{domain_index}
		const download_urls: Array<{ path_index: number; domain_index: number; domain_name: string }> =
			[];
		$('a[href*="/fast_download/"]').each((_, elem) => {
			const href = $(elem).attr('href');
			if (href) {
				const match = href.match(/\/fast_download\/[^/]+\/(\d+)\/(\d+)/);
				if (match) {
					const path_index = parseInt(match[1], 10);
					const domain_index = parseInt(match[2], 10);
					const domain_name = $(elem).text().trim() || 'Unknown';
					download_urls.push({ path_index, domain_index, domain_name });
				}
			}
		});

		logger.info("Retrieved file details from Anna's Archive", {
			md5,
			title,
			extension,
			downloadOptionsCount: download_urls.length
		});

		return {
			md5,
			title,
			author,
			extension,
			filesize,
			download_urls: download_urls.length > 0 ? download_urls : undefined
		};
	} catch (error) {
		logger.error('Error getting available files', error instanceof Error ? error : undefined, {
			md5
		});
		return null;
	}
}

/**
 * Get fast download URL from Anna's Archive
 */
export async function getFastDownloadUrl(
	md5: string,
	pathIndex: number = 0,
	domainIndex: number = 0
): Promise<AnnasArchiveFastDownloadResponse> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error("Anna's Archive API key not configured");
	}

	logger.info("Getting fast download URL from Anna's Archive", { md5, pathIndex, domainIndex });

	try {
		const params = new URLSearchParams({
			md5,
			key: apiKey,
			path_index: pathIndex.toString(),
			domain_index: domainIndex.toString()
		});

		const response = await fetchWithDomainFallback(`/dyn/api/fast_download.json?${params}`, {
			headers: {
				'User-Agent': 'Bookrequestarr/1.0',
				Accept: 'application/json'
			}
		});

		const data: AnnasArchiveFastDownloadResponse = await response.json();

		if (data.error) {
			logger.warn("Anna's Archive fast download error", { md5, error: data.error });
		} else {
			logger.info('Fast download URL obtained', { md5 });
		}

		return data;
	} catch (error) {
		logger.error('Error getting fast download URL', error instanceof Error ? error : undefined, {
			md5
		});
		throw error;
	}
}

/**
 * Download file from URL to destination path
 */
export async function downloadFile(downloadUrl: string, destinationPath: string): Promise<void> {
	logger.info('Starting file download', { destinationPath });

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for downloads

		try {
			const response = await fetch(downloadUrl, {
				headers: {
					'User-Agent': 'Bookrequestarr/1.0'
				},
				signal: controller.signal
			});

			clearTimeout(timeout);

			if (!response.ok) {
				throw new Error(`Download failed: ${response.status} ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error('Response body is null');
			}

			// Stream the download to file
			const fileStream = createWriteStream(destinationPath);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await pipeline(response.body as unknown as NodeJS.ReadableStream, fileStream);

			logger.info('File download completed', { destinationPath });
		} catch (fetchError) {
			clearTimeout(timeout);
			
			if (fetchError instanceof Error && fetchError.name === 'AbortError') {
				throw new Error('File download timed out after 5 minutes');
			}
			
			throw fetchError;
		}
	} catch (error) {
		logger.error('Error downloading file', error instanceof Error ? error : undefined, {
			downloadUrl,
			destinationPath
		});
		throw error;
	}
}
