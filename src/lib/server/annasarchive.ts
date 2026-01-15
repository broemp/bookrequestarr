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

const DEFAULT_ANNAS_ARCHIVE_DOMAIN = 'annas-archive.org';

/**
 * Get Anna's Archive base domain from settings or environment
 */
async function getBaseDomain(): Promise<string> {
	try {
		// First check environment variable
		if (env.ANNAS_ARCHIVE_DOMAIN) {
			return env.ANNAS_ARCHIVE_DOMAIN;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'annas_archive_domain'))
			.limit(1);

		return setting?.value || DEFAULT_ANNAS_ARCHIVE_DOMAIN;
	} catch (error) {
		logger.error(
			"Error fetching Anna's Archive domain",
			error instanceof Error ? error : undefined
		);
		return DEFAULT_ANNAS_ARCHIVE_DOMAIN;
	}
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
		const baseDomain = await getBaseDomain();
		const searchUrl = `https://${baseDomain}/search`;
		const params = new URLSearchParams({
			q: cleanIsbn
		});

		const response = await fetch(`${searchUrl}?${params}`, {
			headers: {
				'User-Agent': 'Bookrequestarr/1.0',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
			}
		});

		if (!response.ok) {
			throw new Error(`Anna's Archive search failed: ${response.statusText}`);
		}

		const html = await response.text();
		const results = parseSearchResults(html);

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
		const baseDomain = await getBaseDomain();
		const searchUrl = `https://${baseDomain}/search`;
		const query = `${title} ${author}`.trim();
		const params = new URLSearchParams({
			q: query
		});

		const response = await fetch(`${searchUrl}?${params}`, {
			headers: {
				'User-Agent': 'Bookrequestarr/1.0',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
			}
		});

		if (!response.ok) {
			throw new Error(`Anna's Archive search failed: ${response.statusText}`);
		}

		const html = await response.text();
		const results = parseSearchResults(html);

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
		const baseDomain = await getBaseDomain();
		const detailsUrl = `https://${baseDomain}/md5/${md5}`;
		const response = await fetch(detailsUrl, {
			headers: {
				'User-Agent': 'Bookrequestarr/1.0',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to get file details: ${response.statusText}`);
		}

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

		logger.info("Retrieved file details from Anna's Archive", { md5, title, extension });

		return {
			md5,
			title,
			author,
			extension,
			filesize
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
		const baseDomain = await getBaseDomain();
		const params = new URLSearchParams({
			md5,
			key: apiKey,
			path_index: pathIndex.toString(),
			domain_index: domainIndex.toString()
		});

		const response = await fetch(`https://${baseDomain}/dyn/api/fast_download.json?${params}`, {
			headers: {
				'User-Agent': 'Bookrequestarr/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`Fast download API failed: ${response.statusText}`);
		}

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
		const response = await fetch(downloadUrl, {
			headers: {
				'User-Agent': 'Bookrequestarr/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`Download failed: ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error('Response body is null');
		}

		// Stream the download to file
		const fileStream = createWriteStream(destinationPath);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await pipeline(response.body as unknown as NodeJS.ReadableStream, fileStream);

		logger.info('File download completed', { destinationPath });
	} catch (error) {
		logger.error('Error downloading file', error instanceof Error ? error : undefined, {
			downloadUrl,
			destinationPath
		});
		throw error;
	}
}
