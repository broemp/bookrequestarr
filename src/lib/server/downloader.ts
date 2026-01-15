import { db } from './db';
import {
	downloads,
	downloadStats,
	requests,
	books,
	settings,
	bookAuthors,
	authors
} from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from './logger';
import type { Book } from '$lib/types/book';
import type { AnnasArchiveSearchResult, SearchMethod } from '$lib/types/download';
import {
	searchByIsbn,
	searchByTitleAuthor,
	getFastDownloadUrl,
	downloadFile,
	canDownloadToday
} from './annasarchive';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Get download directory from settings or use default
 */
async function getDownloadDirectory(): Promise<string> {
	try {
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_directory'))
			.limit(1);

		return setting?.value || './data/downloads';
	} catch (error) {
		logger.error('Error fetching download directory', error instanceof Error ? error : undefined);
		return './data/downloads';
	}
}

/**
 * Get auto-select setting
 */
async function getAutoSelectSetting(): Promise<boolean> {
	try {
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_auto_select'))
			.limit(1);

		return setting?.value === 'true';
	} catch (error) {
		logger.error('Error fetching auto-select setting', error instanceof Error ? error : undefined);
		return true; // Default to auto-select
	}
}

/**
 * Ensure download directory exists
 */
async function ensureDownloadDirectory(): Promise<string> {
	const downloadDir = await getDownloadDirectory();

	if (!existsSync(downloadDir)) {
		await mkdir(downloadDir, { recursive: true });
		logger.info('Created download directory', { directory: downloadDir });
	}

	return downloadDir;
}

/**
 * Update daily download stats
 */
export async function updateDownloadStats(date: Date = new Date()): Promise<void> {
	const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

	try {
		// Check if stat exists for today
		const [existing] = await db
			.select()
			.from(downloadStats)
			.where(eq(downloadStats.date, dateStr))
			.limit(1);

		if (existing) {
			// Increment count
			await db
				.update(downloadStats)
				.set({ downloadCount: existing.downloadCount + 1 })
				.where(eq(downloadStats.date, dateStr));
		} else {
			// Create new stat
			await db.insert(downloadStats).values({
				id: crypto.randomUUID(),
				date: dateStr,
				downloadCount: 1
			});
		}

		logger.info('Updated download stats', { date: dateStr });
	} catch (error) {
		logger.error('Error updating download stats', error instanceof Error ? error : undefined);
	}
}

/**
 * Search for book on Anna's Archive using ISBN first, then title/author
 */
export async function searchForBook(
	book: Book
): Promise<{ results: AnnasArchiveSearchResult[]; method: SearchMethod }> {
	logger.info("Searching for book on Anna's Archive", { bookId: book.id, title: book.title });

	// Try ISBN first (ISBN-13, then ISBN-10)
	if (book.isbn13) {
		try {
			const results = await searchByIsbn(book.isbn13);
			if (results.length > 0) {
				logger.info('Found book by ISBN-13', { bookId: book.id, resultsCount: results.length });
				return { results, method: 'isbn' };
			}
		} catch {
			logger.warn('ISBN-13 search failed, trying ISBN-10', { bookId: book.id });
		}
	}

	if (book.isbn10) {
		try {
			const results = await searchByIsbn(book.isbn10);
			if (results.length > 0) {
				logger.info('Found book by ISBN-10', { bookId: book.id, resultsCount: results.length });
				return { results, method: 'isbn' };
			}
		} catch {
			logger.warn('ISBN-10 search failed, trying title/author', { bookId: book.id });
		}
	}

	// Fallback to title and author search
	// Get author name from book_authors junction table
	const bookWithAuthor = await db
		.select({
			authorName: sql<string>`GROUP_CONCAT(${authors.name}, ', ')`
		})
		.from(bookAuthors)
		.innerJoin(authors, eq(bookAuthors.authorId, authors.id))
		.where(eq(bookAuthors.bookId, book.id))
		.limit(1);

	const authorName = bookWithAuthor[0]?.authorName || 'Unknown';

	try {
		const results = await searchByTitleAuthor(book.title, authorName);
		logger.info('Found book by title/author', { bookId: book.id, resultsCount: results.length });
		return { results, method: 'title_author' };
	} catch (error) {
		logger.error('Title/author search failed', error instanceof Error ? error : undefined, {
			bookId: book.id
		});
		return { results: [], method: 'title_author' };
	}
}

/**
 * Select best file from available results
 */
export async function selectBestFile(
	results: AnnasArchiveSearchResult[],
	preferredType?: string | null
): Promise<AnnasArchiveSearchResult | null> {
	if (results.length === 0) return null;

	// If preferred type is specified, try to find it
	if (preferredType) {
		const preferred = results.find(
			(r) => r.extension?.toLowerCase() === preferredType.toLowerCase()
		);
		if (preferred) {
			logger.info('Selected file by preferred type', { extension: preferredType });
			return preferred;
		}
	}

	// Default preference order: epub > pdf > mobi > azw3
	const preferenceOrder = ['epub', 'pdf', 'mobi', 'azw3'];

	for (const ext of preferenceOrder) {
		const match = results.find((r) => r.extension?.toLowerCase() === ext);
		if (match) {
			logger.info('Selected file by preference order', { extension: ext });
			return match;
		}
	}

	// If no preferred type found, return first result (usually sorted by most downloads)
	logger.info('Selected first available file', { extension: results[0].extension });
	return results[0];
}

/**
 * Get download status for a request
 */
export async function getDownloadStatus(requestId: string) {
	try {
		const [download] = await db
			.select()
			.from(downloads)
			.where(eq(downloads.requestId, requestId))
			.orderBy(sql`${downloads.createdAt} DESC`)
			.limit(1);

		return download || null;
	} catch (error) {
		logger.error('Error getting download status', error instanceof Error ? error : undefined, {
			requestId
		});
		return null;
	}
}

/**
 * Initiate download process for a request
 */
export async function initiateDownload(
	requestId: string,
	options?: {
		md5?: string;
		fileType?: string;
		pathIndex?: number;
		domainIndex?: number;
		manual?: boolean;
	}
): Promise<{
	success: boolean;
	downloadId?: string;
	error?: string;
	requiresSelection?: boolean;
	results?: AnnasArchiveSearchResult[];
}> {
	logger.info('Initiating download', { requestId, options });

	try {
		// Check daily limit
		const { allowed, current, limit } = await canDownloadToday();
		if (!allowed) {
			const error = `Daily download limit reached (${current}/${limit})`;
			logger.warn(error, { requestId });
			return { success: false, error };
		}

		// Get request and book details
		const [request] = await db
			.select({
				request: requests,
				book: books
			})
			.from(requests)
			.innerJoin(books, eq(requests.bookId, books.id))
			.where(eq(requests.id, requestId))
			.limit(1);

		if (!request) {
			return { success: false, error: 'Request not found' };
		}

		let md5: string;
		let searchMethod: SearchMethod;
		let fileType: string;

		// If MD5 is provided (manual selection), use it
		if (options?.md5) {
			md5 = options.md5;
			searchMethod = options.manual ? 'manual' : 'isbn';
			fileType = options.fileType || 'epub';
		} else {
			// Search for the book
			const searchResult = await searchForBook(request.book);

			if (searchResult.results.length === 0) {
				const error = "Book not found on Anna's Archive";
				logger.warn(error, { requestId, bookId: request.book.id });

				// Update request status to download_problem
				await db
					.update(requests)
					.set({ status: 'download_problem', updatedAt: new Date() })
					.where(eq(requests.id, requestId));

				return { success: false, error };
			}

			searchMethod = searchResult.method;

			// Check if auto-select is enabled
			const autoSelect = await getAutoSelectSetting();

			if (!autoSelect && searchResult.results.length > 1) {
				// Return results for manual selection
				logger.info('Multiple results found, requiring manual selection', {
					requestId,
					count: searchResult.results.length
				});
				return {
					success: false,
					requiresSelection: true,
					results: searchResult.results
				};
			}

			// Auto-select best file
			const selectedFile = await selectBestFile(
				searchResult.results,
				options?.fileType || request.request.language
			);

			if (!selectedFile) {
				return { success: false, error: 'No suitable file found' };
			}

			md5 = selectedFile.md5;
			fileType = selectedFile.extension || 'epub';
		}

		// Create download record
		const downloadId = crypto.randomUUID();
		await db.insert(downloads).values({
			id: downloadId,
			requestId,
			annasArchiveMd5: md5,
			searchMethod,
			fileType,
			downloadStatus: 'pending'
		});

		logger.info('Download record created', { downloadId, requestId, md5 });

		// Process download asynchronously
		processDownload(downloadId, md5, fileType, options?.pathIndex, options?.domainIndex).catch(
			(error) => {
				logger.error('Background download failed', error instanceof Error ? error : undefined, {
					downloadId
				});
			}
		);

		return { success: true, downloadId };
	} catch (error) {
		logger.error('Error initiating download', error instanceof Error ? error : undefined, {
			requestId
		});
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

/**
 * Process download (background operation)
 */
async function processDownload(
	downloadId: string,
	md5: string,
	fileType: string,
	pathIndex: number = 0,
	domainIndex: number = 0
): Promise<void> {
	logger.info('Processing download', { downloadId, md5 });

	try {
		// Update status to downloading
		await db
			.update(downloads)
			.set({ downloadStatus: 'downloading' })
			.where(eq(downloads.id, downloadId));

		// Get fast download URL
		const downloadResponse = await getFastDownloadUrl(md5, pathIndex, domainIndex);

		if (!downloadResponse.download_url) {
			throw new Error(downloadResponse.error || 'Failed to get download URL');
		}

		// Ensure download directory exists
		const downloadDir = await ensureDownloadDirectory();

		// Generate filename
		const filename = `${md5}.${fileType}`;
		const filePath = join(downloadDir, filename);

		// Download file
		await downloadFile(downloadResponse.download_url, filePath);

		// Get file size
		const fs = await import('fs/promises');
		const stats = await fs.stat(filePath);

		// Update download record
		await db
			.update(downloads)
			.set({
				downloadStatus: 'completed',
				filePath,
				fileSize: stats.size,
				downloadedAt: new Date()
			})
			.where(eq(downloads.id, downloadId));

		// Update download stats
		await updateDownloadStats();

		// Get request ID and update request status to completed
		const [download] = await db
			.select()
			.from(downloads)
			.where(eq(downloads.id, downloadId))
			.limit(1);

		if (download) {
			await db
				.update(requests)
				.set({ status: 'completed', updatedAt: new Date() })
				.where(eq(requests.id, download.requestId));
		}

		logger.info('Download completed successfully', { downloadId, filePath });
	} catch (error) {
		logger.error('Download processing failed', error instanceof Error ? error : undefined, {
			downloadId
		});

		// Update download record with error
		await db
			.update(downloads)
			.set({
				downloadStatus: 'failed',
				errorMessage: error instanceof Error ? error.message : 'Unknown error'
			})
			.where(eq(downloads.id, downloadId));

		// Update request status to download_problem
		const [download] = await db
			.select()
			.from(downloads)
			.where(eq(downloads.id, downloadId))
			.limit(1);

		if (download) {
			await db
				.update(requests)
				.set({ status: 'download_problem', updatedAt: new Date() })
				.where(eq(requests.id, download.requestId));
		}
	}
}

/**
 * Retry failed download
 */
export async function retryDownload(
	downloadId: string
): Promise<{ success: boolean; error?: string }> {
	logger.info('Retrying download', { downloadId });

	try {
		const [download] = await db
			.select()
			.from(downloads)
			.where(eq(downloads.id, downloadId))
			.limit(1);

		if (!download) {
			return { success: false, error: 'Download not found' };
		}

		if (download.downloadStatus !== 'failed') {
			return { success: false, error: 'Download is not in failed state' };
		}

		// Check daily limit
		const { allowed, current, limit } = await canDownloadToday();
		if (!allowed) {
			return { success: false, error: `Daily download limit reached (${current}/${limit})` };
		}

		// Reset download status and clear error
		await db
			.update(downloads)
			.set({
				downloadStatus: 'pending',
				errorMessage: null
			})
			.where(eq(downloads.id, downloadId));

		// Process download again
		processDownload(downloadId, download.annasArchiveMd5, download.fileType).catch((error) => {
			logger.error('Retry download failed', error instanceof Error ? error : undefined, {
				downloadId
			});
		});

		return { success: true };
	} catch (error) {
		logger.error('Error retrying download', error instanceof Error ? error : undefined, {
			downloadId
		});
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}
