import { db } from './db';
import {
	downloads,
	requests,
	books,
	settings,
	bookAuthors,
	authors,
	downloadStats
} from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from './logger';
import type { Book } from '$lib/types/book';
import type { DownloadSource, DownloadSourcePriority, AnnasArchiveSearchResult } from '$lib/types/download';
import { DOWNLOAD_SETTINGS_KEYS, DOWNLOAD_SETTINGS_DEFAULTS } from '$lib/types/download';
import * as prowlarr from './prowlarr';
import * as sabnzbd from './sabnzbd';
import * as annasArchive from './annasarchive';
import {
	calculateConfidence,
	bookToMatchRequest,
	parseReleaseName,
	ConfidenceLevel,
	type BookMatchRequest,
	type SearchResultCandidate,
	type MatchResult
} from './resultMatcher';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a download orchestration attempt
 */
export interface DownloadOrchestrationResult {
	success: boolean;
	downloadId?: string;
	source?: DownloadSource;
	error?: string;
	/** If manual selection is required */
	requiresSelection?: boolean;
	/** Search results for manual selection (Anna's Archive) */
	annasArchiveResults?: AnnasArchiveSearchResult[];
	/** Prowlarr results with confidence scores for manual selection */
	prowlarrResults?: ProwlarrMatchedResult[];
}

/**
 * Prowlarr search result with confidence scoring
 */
export interface ProwlarrMatchedResult {
	result: prowlarr.ProwlarrSearchResult;
	matchResult: MatchResult;
}

/**
 * Options for initiating a download
 */
export interface InitiateDownloadOptions {
	/** Override download source (skip priority logic) */
	forceSource?: DownloadSource;
	/** For Anna's Archive manual selection */
	md5?: string;
	fileType?: string;
	/** For Prowlarr manual selection */
	prowlarrGuid?: string;
	/** Path/domain indices for Anna's Archive */
	pathIndex?: number;
	domainIndex?: number;
	/** Mark as manual selection */
	manual?: boolean;
}

// ============================================================================
// Settings Helpers
// ============================================================================

/**
 * Get a setting value with default fallback
 */
async function getSetting(key: string): Promise<string> {
	try {
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, key))
			.limit(1);

		return setting?.value || DOWNLOAD_SETTINGS_DEFAULTS[key] || '';
	} catch (error) {
		logger.error('Error fetching setting', error instanceof Error ? error : undefined, { key });
		return DOWNLOAD_SETTINGS_DEFAULTS[key] || '';
	}
}

/**
 * Get download source priority setting
 */
async function getDownloadSourcePriority(): Promise<DownloadSourcePriority> {
	const value = await getSetting(DOWNLOAD_SETTINGS_KEYS.DOWNLOAD_SOURCE_PRIORITY);
	return (value as DownloadSourcePriority) || 'prowlarr_first';
}

/**
 * Get minimum confidence score threshold
 */
async function getMinConfidenceScore(): Promise<number> {
	const value = await getSetting(DOWNLOAD_SETTINGS_KEYS.MIN_CONFIDENCE_SCORE);
	const score = parseInt(value, 10);
	return isNaN(score) ? 50 : score;
}

/**
 * Get download directory from settings
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

// ============================================================================
// Book Information Helpers
// ============================================================================

/**
 * Get book and request information for download
 */
async function getRequestWithBook(requestId: string): Promise<{
	request: typeof requests.$inferSelect;
	book: typeof books.$inferSelect;
} | null> {
	const [result] = await db
		.select({
			request: requests,
			book: books
		})
		.from(requests)
		.innerJoin(books, eq(requests.bookId, books.id))
		.where(eq(requests.id, requestId))
		.limit(1);

	return result || null;
}

/**
 * Get author name(s) for a book
 */
async function getBookAuthorName(bookId: string): Promise<string> {
	const result = await db
		.select({
			authorName: sql<string>`GROUP_CONCAT(${authors.name}, ', ')`
		})
		.from(bookAuthors)
		.innerJoin(authors, eq(bookAuthors.authorId, authors.id))
		.where(eq(bookAuthors.bookId, bookId))
		.limit(1);

	return result[0]?.authorName || 'Unknown';
}

// ============================================================================
// Prowlarr Integration
// ============================================================================

/**
 * Search Prowlarr and score results
 */
async function searchProwlarr(
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): Promise<ProwlarrMatchedResult[]> {
	const matchRequest = bookToMatchRequest(book, authorName, preferredLanguage);
	const minScore = await getMinConfidenceScore();
	const results: ProwlarrMatchedResult[] = [];

	// First try searching by ISBN (highest accuracy)
	if (book.isbn13 || book.isbn10) {
		const isbn = book.isbn13 || book.isbn10;
		logger.info('Searching Prowlarr by ISBN', { isbn });

		const isbnResult = await prowlarr.searchByIsbn(isbn!, { type: 'book' });

		if (isbnResult.success && isbnResult.results && isbnResult.results.length > 0) {
			// Filter to Usenet only and score results
			const usenetResults = prowlarr.filterUsenetResults(isbnResult.results);
			const scoredResults = scoreAndFilterResults(usenetResults, matchRequest, minScore);
			results.push(...scoredResults);
		}
	}

	// If no good ISBN results, try title + author search
	if (results.length === 0 || !results.some((r) => r.matchResult.level === ConfidenceLevel.HIGH)) {
		logger.info('Searching Prowlarr by title/author', {
			title: book.title,
			author: authorName
		});

		const titleAuthorResult = await prowlarr.searchByTitleAuthor(book.title, authorName, {
			type: 'book'
		});

		if (titleAuthorResult.success && titleAuthorResult.results && titleAuthorResult.results.length > 0) {
			const usenetResults = prowlarr.filterUsenetResults(titleAuthorResult.results);
			const scoredResults = scoreAndFilterResults(usenetResults, matchRequest, minScore);

			// Add new results that aren't already in the list
			const existingGuids = new Set(results.map((r) => r.result.guid));
			for (const scored of scoredResults) {
				if (!existingGuids.has(scored.result.guid)) {
					results.push(scored);
				}
			}
		}
	}

	// Sort by confidence score (highest first)
	results.sort((a, b) => b.matchResult.score - a.matchResult.score);

	logger.info('Prowlarr search completed', {
		totalResults: results.length,
		highConfidence: results.filter((r) => r.matchResult.level === ConfidenceLevel.HIGH).length,
		mediumConfidence: results.filter((r) => r.matchResult.level === ConfidenceLevel.MEDIUM).length
	});

	return results;
}

/**
 * Score and filter Prowlarr results based on confidence matching
 */
function scoreAndFilterResults(
	results: prowlarr.ProwlarrSearchResult[],
	matchRequest: BookMatchRequest,
	minScore: number
): ProwlarrMatchedResult[] {
	const scored: ProwlarrMatchedResult[] = [];

	for (const result of results) {
		// Parse the release name to extract metadata
		const parsed = parseReleaseName(result.title);

		// Create a candidate for matching
		const candidate: SearchResultCandidate = {
			title: parsed.title || result.title,
			author: parsed.author,
			year: parsed.year,
			language: parsed.language
		};

		const matchResult = calculateConfidence(candidate, matchRequest);

		// Only include results above minimum threshold
		if (matchResult.score >= minScore) {
			scored.push({ result, matchResult });
		} else {
			logger.debug('Prowlarr result below threshold', {
				title: result.title,
				score: matchResult.score,
				minScore
			});
		}
	}

	return scored;
}

/**
 * Send NZB to SABnzbd and create download record
 */
async function downloadViaSabnzbd(
	requestId: string,
	prowlarrResult: prowlarr.ProwlarrSearchResult,
	confidenceScore: number,
	searchMethod: 'isbn' | 'title_author' | 'manual'
): Promise<{ success: boolean; downloadId?: string; error?: string }> {
	const nzbUrl = prowlarr.getNzbUrl(prowlarrResult);

	if (!nzbUrl) {
		return { success: false, error: 'No NZB download URL available' };
	}

	logger.info('Sending NZB to SABnzbd', {
		requestId,
		indexer: prowlarrResult.indexer,
		title: prowlarrResult.title
	});

	try {
		// Send to SABnzbd
		const nzoId = await sabnzbd.addNzbByUrl(nzbUrl, prowlarrResult.title);

		// Create download record
		const downloadId = crypto.randomUUID();
		await db.insert(downloads).values({
			id: downloadId,
			requestId,
			downloadSource: 'prowlarr',
			sabnzbdNzoId: nzoId,
			nzbName: prowlarrResult.title,
			indexerName: prowlarrResult.indexer,
			confidenceScore,
			searchMethod,
			fileType: 'nzb',
			downloadStatus: 'downloading'
		});

		// Update request status to approved (download in progress)
		await db
			.update(requests)
			.set({ status: 'approved', updatedAt: new Date() })
			.where(eq(requests.id, requestId));

		logger.info('NZB sent to SABnzbd successfully', {
			downloadId,
			nzoId,
			indexer: prowlarrResult.indexer
		});

		return { success: true, downloadId };
	} catch (error) {
		logger.error('Failed to send NZB to SABnzbd', error instanceof Error ? error : undefined, {
			requestId
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to send NZB to SABnzbd'
		};
	}
}

// ============================================================================
// Anna's Archive Integration
// ============================================================================

/**
 * Search Anna's Archive for a book
 */
async function searchAnnasArchive(
	book: Book,
	authorName: string
): Promise<{ results: AnnasArchiveSearchResult[]; method: 'isbn' | 'title_author' }> {
	logger.info("Searching Anna's Archive", { bookId: book.id, title: book.title });

	// Try ISBN first (ISBN-13, then ISBN-10)
	if (book.isbn13) {
		try {
			const results = await annasArchive.searchByIsbn(book.isbn13);
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
			const results = await annasArchive.searchByIsbn(book.isbn10);
			if (results.length > 0) {
				logger.info('Found book by ISBN-10', { bookId: book.id, resultsCount: results.length });
				return { results, method: 'isbn' };
			}
		} catch {
			logger.warn('ISBN-10 search failed, trying title/author', { bookId: book.id });
		}
	}

	// Fallback to title and author search
	try {
		const results = await annasArchive.searchByTitleAuthor(book.title, authorName);
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
 * Select best file from Anna's Archive results
 */
function selectBestAnnasArchiveFile(
	results: AnnasArchiveSearchResult[],
	preferredType?: string | null
): AnnasArchiveSearchResult | null {
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

	// If no preferred type found, return first result
	logger.info('Selected first available file', { extension: results[0].extension });
	return results[0];
}

/**
 * Download via Anna's Archive and create download record
 */
async function downloadViaAnnasArchive(
	requestId: string,
	md5: string,
	fileType: string,
	searchMethod: 'isbn' | 'title_author' | 'manual',
	pathIndex: number = 0,
	domainIndex: number = 0
): Promise<{ success: boolean; downloadId?: string; error?: string }> {
	logger.info("Downloading via Anna's Archive", { requestId, md5 });

	try {
		// Create download record
		const downloadId = crypto.randomUUID();
		await db.insert(downloads).values({
			id: downloadId,
			requestId,
			downloadSource: 'annas_archive',
			annasArchiveMd5: md5,
			searchMethod,
			fileType,
			downloadStatus: 'pending'
		});

		// Process download asynchronously
		processAnnasArchiveDownload(downloadId, md5, fileType, pathIndex, domainIndex).catch(
			(error) => {
				logger.error('Background Anna\'s Archive download failed', error instanceof Error ? error : undefined, {
					downloadId
				});
			}
		);

		return { success: true, downloadId };
	} catch (error) {
		logger.error("Error initiating Anna's Archive download", error instanceof Error ? error : undefined, {
			requestId
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Process Anna's Archive download (background operation)
 */
async function processAnnasArchiveDownload(
	downloadId: string,
	md5: string,
	fileType: string,
	pathIndex: number = 0,
	domainIndex: number = 0
): Promise<void> {
	logger.info("Processing Anna's Archive download", { downloadId, md5 });

	try {
		// Update status to downloading
		await db
			.update(downloads)
			.set({ downloadStatus: 'downloading' })
			.where(eq(downloads.id, downloadId));

		// Get fast download URL
		const downloadResponse = await annasArchive.getFastDownloadUrl(md5, pathIndex, domainIndex);

		if (!downloadResponse.download_url) {
			throw new Error(downloadResponse.error || 'Failed to get download URL');
		}

		// Ensure download directory exists
		const downloadDir = await ensureDownloadDirectory();

		// Generate filename
		const filename = `${md5}.${fileType}`;
		const filePath = join(downloadDir, filename);

		// Download file
		await annasArchive.downloadFile(downloadResponse.download_url, filePath);

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

		logger.info("Anna's Archive download completed successfully", { downloadId, filePath });
	} catch (error) {
		logger.error("Anna's Archive download processing failed", error instanceof Error ? error : undefined, {
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
 * Update daily download stats
 */
async function updateDownloadStats(date: Date = new Date()): Promise<void> {
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

// ============================================================================
// Main Orchestration Logic
// ============================================================================

/**
 * Initiate download for a request using the configured download source priority
 *
 * Flow:
 * 1. Check download source priority setting
 * 2. If Prowlarr is primary and configured:
 *    a. Search Prowlarr by ISBN (primary), then title+author (fallback)
 *    b. Filter results by category (books)
 *    c. Calculate confidence score for each result
 *    d. Select best result above threshold
 *    e. Send NZB to SABnzbd
 * 3. If no Prowlarr results or Prowlarr disabled:
 *    a. Fall back to Anna's Archive
 * 4. Create download record and track status
 */
export async function initiateDownload(
	requestId: string,
	options: InitiateDownloadOptions = {}
): Promise<DownloadOrchestrationResult> {
	logger.info('Initiating download via orchestrator', { requestId, options });

	try {
		// Get request and book details
		const requestWithBook = await getRequestWithBook(requestId);

		if (!requestWithBook) {
			return { success: false, error: 'Request not found' };
		}

		const { request, book } = requestWithBook;
		const authorName = await getBookAuthorName(book.id);

		// Handle manual selection cases
		if (options.md5) {
			// Anna's Archive manual selection
			return handleAnnasArchiveDownload(
				requestId,
				options.md5,
				options.fileType || 'epub',
				options.manual ? 'manual' : 'isbn',
				options.pathIndex,
				options.domainIndex
			);
		}

		if (options.prowlarrGuid) {
			// Prowlarr manual selection - need to search again to get full result
			return handleProwlarrManualSelection(requestId, options.prowlarrGuid, book, authorName);
		}

		// Determine download source order based on priority setting and force option
		const priority = options.forceSource
			? (options.forceSource === 'prowlarr' ? 'prowlarr_only' : 'annas_archive_only')
			: await getDownloadSourcePriority();

		logger.info('Using download source priority', { priority });

		// Execute based on priority
		switch (priority) {
			case 'prowlarr_first':
				return orchestrateProwlarrFirst(requestId, book, authorName, request.language);

			case 'annas_archive_first':
				return orchestrateAnnasArchiveFirst(requestId, book, authorName, request.language);

			case 'prowlarr_only':
				return orchestrateProwlarrOnly(requestId, book, authorName, request.language);

			case 'annas_archive_only':
				return orchestrateAnnasArchiveOnly(requestId, book, authorName, request.language);

			default:
				return orchestrateProwlarrFirst(requestId, book, authorName, request.language);
		}
	} catch (error) {
		logger.error('Error in download orchestration', error instanceof Error ? error : undefined, {
			requestId
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Prowlarr first, Anna's Archive fallback
 */
async function orchestrateProwlarrFirst(
	requestId: string,
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): Promise<DownloadOrchestrationResult> {
	// Check if Prowlarr is configured
	const prowlarrConfigured = await prowlarr.isProwlarrConfigured();
	const sabnzbdConfigured = await sabnzbd.isSabnzbdConfigured();

	if (prowlarrConfigured && sabnzbdConfigured) {
		// Try Prowlarr
		const prowlarrResults = await searchProwlarr(book, authorName, preferredLanguage);

		if (prowlarrResults.length > 0) {
			const autoSelect = await getAutoSelectSetting();
			const bestResult = prowlarrResults[0];

			// Auto-download if high confidence and auto-select enabled
			if (autoSelect && bestResult.matchResult.level === ConfidenceLevel.HIGH) {
				const downloadResult = await downloadViaSabnzbd(
					requestId,
					bestResult.result,
					bestResult.matchResult.score,
					book.isbn13 || book.isbn10 ? 'isbn' : 'title_author'
				);

				if (downloadResult.success) {
					return {
						success: true,
						downloadId: downloadResult.downloadId,
						source: 'prowlarr'
					};
				}

				// If SABnzbd fails, fall through to Anna's Archive
				logger.warn('SABnzbd download failed, falling back to Anna\'s Archive', {
					requestId,
					error: downloadResult.error
				});
			} else if (!autoSelect || prowlarrResults.length > 1) {
				// Return results for manual selection
				logger.info('Multiple Prowlarr results found, requiring manual selection', {
					requestId,
					count: prowlarrResults.length
				});
				return {
					success: false,
					requiresSelection: true,
					prowlarrResults
				};
			}
		}

		logger.info('No suitable Prowlarr results, falling back to Anna\'s Archive', { requestId });
	} else {
		logger.info('Prowlarr/SABnzbd not configured, using Anna\'s Archive', { requestId });
	}

	// Fallback to Anna's Archive
	return orchestrateAnnasArchiveOnly(requestId, book, authorName, preferredLanguage);
}

/**
 * Anna's Archive first, Prowlarr fallback
 */
async function orchestrateAnnasArchiveFirst(
	requestId: string,
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): Promise<DownloadOrchestrationResult> {
	// Check daily limit for Anna's Archive
	const { allowed } = await annasArchive.canDownloadToday();

	if (allowed) {
		// Try Anna's Archive
		const annasResult = await tryAnnasArchiveDownload(requestId, book, authorName, preferredLanguage);

		if (annasResult.success) {
			return annasResult;
		}

		if (annasResult.requiresSelection) {
			return annasResult;
		}

		logger.info('Anna\'s Archive download failed, trying Prowlarr', { requestId });
	} else {
		logger.info('Anna\'s Archive daily limit reached, trying Prowlarr', { requestId });
	}

	// Fallback to Prowlarr
	return orchestrateProwlarrOnly(requestId, book, authorName, preferredLanguage);
}

/**
 * Prowlarr only (no fallback)
 */
async function orchestrateProwlarrOnly(
	requestId: string,
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): Promise<DownloadOrchestrationResult> {
	const prowlarrConfigured = await prowlarr.isProwlarrConfigured();
	const sabnzbdConfigured = await sabnzbd.isSabnzbdConfigured();

	if (!prowlarrConfigured) {
		return { success: false, error: 'Prowlarr is not configured' };
	}

	if (!sabnzbdConfigured) {
		return { success: false, error: 'SABnzbd is not configured' };
	}

	const prowlarrResults = await searchProwlarr(book, authorName, preferredLanguage);

	if (prowlarrResults.length === 0) {
		// Update request status to download_problem
		await db
			.update(requests)
			.set({ status: 'download_problem', updatedAt: new Date() })
			.where(eq(requests.id, requestId));

		return { success: false, error: 'No results found on Prowlarr' };
	}

	const autoSelect = await getAutoSelectSetting();
	const bestResult = prowlarrResults[0];

	// Auto-download if high confidence and auto-select enabled
	if (autoSelect && bestResult.matchResult.level === ConfidenceLevel.HIGH) {
		const downloadResult = await downloadViaSabnzbd(
			requestId,
			bestResult.result,
			bestResult.matchResult.score,
			book.isbn13 || book.isbn10 ? 'isbn' : 'title_author'
		);

		if (downloadResult.success) {
			return {
				success: true,
				downloadId: downloadResult.downloadId,
				source: 'prowlarr'
			};
		}

		return { success: false, error: downloadResult.error };
	}

	// Return results for manual selection
	return {
		success: false,
		requiresSelection: true,
		prowlarrResults
	};
}

/**
 * Anna's Archive only (no fallback)
 */
async function orchestrateAnnasArchiveOnly(
	requestId: string,
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): Promise<DownloadOrchestrationResult> {
	const { allowed, current, limit } = await annasArchive.canDownloadToday();

	if (!allowed) {
		return {
			success: false,
			error: `Daily download limit reached (${current}/${limit})`
		};
	}

	return tryAnnasArchiveDownload(requestId, book, authorName, preferredLanguage);
}

/**
 * Try to download via Anna's Archive
 */
async function tryAnnasArchiveDownload(
	requestId: string,
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): Promise<DownloadOrchestrationResult> {
	const searchResult = await searchAnnasArchive(book, authorName);

	if (searchResult.results.length === 0) {
		// Update request status to download_problem
		await db
			.update(requests)
			.set({ status: 'download_problem', updatedAt: new Date() })
			.where(eq(requests.id, requestId));

		return { success: false, error: 'Book not found on Anna\'s Archive' };
	}

	const autoSelect = await getAutoSelectSetting();

	if (!autoSelect && searchResult.results.length > 1) {
		// Return results for manual selection
		return {
			success: false,
			requiresSelection: true,
			annasArchiveResults: searchResult.results
		};
	}

	// Auto-select best file
	const selectedFile = selectBestAnnasArchiveFile(searchResult.results, preferredLanguage);

	if (!selectedFile) {
		return { success: false, error: 'No suitable file found' };
	}

	return handleAnnasArchiveDownload(
		requestId,
		selectedFile.md5,
		selectedFile.extension || 'epub',
		searchResult.method
	);
}

/**
 * Handle Anna's Archive download with the given MD5
 */
async function handleAnnasArchiveDownload(
	requestId: string,
	md5: string,
	fileType: string,
	searchMethod: 'isbn' | 'title_author' | 'manual',
	pathIndex?: number,
	domainIndex?: number
): Promise<DownloadOrchestrationResult> {
	const result = await downloadViaAnnasArchive(
		requestId,
		md5,
		fileType,
		searchMethod,
		pathIndex,
		domainIndex
	);

	if (result.success) {
		return {
			success: true,
			downloadId: result.downloadId,
			source: 'annas_archive'
		};
	}

	return { success: false, error: result.error };
}

/**
 * Handle Prowlarr manual selection
 */
async function handleProwlarrManualSelection(
	requestId: string,
	guid: string,
	book: Book,
	authorName: string
): Promise<DownloadOrchestrationResult> {
	// Search again to get the full result
	const searchResult = await prowlarr.searchByTitleAuthor(book.title, authorName, { type: 'book' });

	if (!searchResult.success || !searchResult.results) {
		return { success: false, error: 'Failed to find selected result' };
	}

	const selectedResult = searchResult.results.find((r) => r.guid === guid);

	if (!selectedResult) {
		return { success: false, error: 'Selected result not found' };
	}

	// Calculate confidence score for the manually selected result
	const parsed = parseReleaseName(selectedResult.title);
	const matchRequest = bookToMatchRequest(book, authorName);
	const candidate: SearchResultCandidate = {
		title: parsed.title || selectedResult.title,
		author: parsed.author,
		year: parsed.year,
		language: parsed.language
	};
	const matchResult = calculateConfidence(candidate, matchRequest);

	const downloadResult = await downloadViaSabnzbd(
		requestId,
		selectedResult,
		matchResult.score,
		'manual'
	);

	if (downloadResult.success) {
		return {
			success: true,
			downloadId: downloadResult.downloadId,
			source: 'prowlarr'
		};
	}

	return { success: false, error: downloadResult.error };
}

// ============================================================================
// Status Checking
// ============================================================================

/**
 * Check and update SABnzbd download status for all active downloads
 * This should be called periodically (e.g., every 30 seconds)
 */
export async function updateSabnzbdDownloadStatuses(): Promise<void> {
	logger.debug('Checking SABnzbd download statuses');

	try {
		// Get all downloads with SABnzbd IDs that are not completed or failed
		const activeDownloads = await db
			.select()
			.from(downloads)
			.where(eq(downloads.downloadSource, 'prowlarr'));

		const inProgressDownloads = activeDownloads.filter(
			(d) =>
				d.sabnzbdNzoId &&
				(d.downloadStatus === 'pending' || d.downloadStatus === 'downloading')
		);

		if (inProgressDownloads.length === 0) {
			logger.debug('No active SABnzbd downloads to check');
			return;
		}

		logger.info('Checking SABnzbd status for downloads', {
			count: inProgressDownloads.length
		});

		for (const download of inProgressDownloads) {
			if (!download.sabnzbdNzoId) continue;

			try {
				const status = await sabnzbd.getDownloadStatus(download.sabnzbdNzoId);

				if (!status) {
					logger.warn('SABnzbd download not found', {
						downloadId: download.id,
						nzoId: download.sabnzbdNzoId
					});
					continue;
				}

				// Update based on status
				if (status.status === 'completed') {
					logger.info('SABnzbd download completed', {
						downloadId: download.id,
						storagePath: status.storagePath
					});

					await db
						.update(downloads)
						.set({
							downloadStatus: 'completed',
							filePath: status.storagePath,
							fileSize: status.size,
							downloadedAt: new Date()
						})
						.where(eq(downloads.id, download.id));

					// Update request status
					await db
						.update(requests)
						.set({ status: 'completed', updatedAt: new Date() })
						.where(eq(requests.id, download.requestId));

					// Update download stats
					await updateDownloadStats();
				} else if (status.status === 'failed') {
					logger.warn('SABnzbd download failed', {
						downloadId: download.id,
						error: status.errorMessage
					});

					await db
						.update(downloads)
						.set({
							downloadStatus: 'failed',
							errorMessage: status.errorMessage || 'Download failed'
						})
						.where(eq(downloads.id, download.id));

					// Update request status
					await db
						.update(requests)
						.set({ status: 'download_problem', updatedAt: new Date() })
						.where(eq(requests.id, download.requestId));
				} else if (status.status === 'downloading' || status.status === 'processing') {
					// Still in progress - update status if changed
					if (download.downloadStatus !== 'downloading') {
						await db
							.update(downloads)
							.set({ downloadStatus: 'downloading' })
							.where(eq(downloads.id, download.id));
					}
				}
			} catch (error) {
				logger.error('Error checking SABnzbd status', error instanceof Error ? error : undefined, {
					downloadId: download.id
				});
			}
		}
	} catch (error) {
		logger.error('Error updating SABnzbd download statuses', error instanceof Error ? error : undefined);
	}
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
 * Get all active SABnzbd downloads (for monitoring/admin dashboard)
 */
export async function getActiveSabnzbdDownloads() {
	try {
		const activeDownloads = await db
			.select({
				download: downloads,
				request: requests,
				book: books
			})
			.from(downloads)
			.innerJoin(requests, eq(downloads.requestId, requests.id))
			.innerJoin(books, eq(requests.bookId, books.id))
			.where(eq(downloads.downloadSource, 'prowlarr'));

		// Filter to only in-progress downloads
		const inProgress = activeDownloads.filter(
			(d) =>
				d.download.sabnzbdNzoId &&
				(d.download.downloadStatus === 'pending' || d.download.downloadStatus === 'downloading')
		);

		return inProgress.map((d) => ({
			downloadId: d.download.id,
			requestId: d.download.requestId,
			bookTitle: d.book.title,
			nzoId: d.download.sabnzbdNzoId,
			nzbName: d.download.nzbName,
			indexer: d.download.indexerName,
			status: d.download.downloadStatus,
			confidenceScore: d.download.confidenceScore,
			createdAt: d.download.createdAt
		}));
	} catch (error) {
		logger.error('Error getting active SABnzbd downloads', error instanceof Error ? error : undefined);
		return [];
	}
}

/**
 * Retry a failed download
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

		if (download.downloadSource === 'annas_archive') {
			// Retry Anna's Archive download
			if (!download.annasArchiveMd5) {
				return { success: false, error: 'Missing Anna\'s Archive MD5 hash' };
			}

			// Check daily limit
			const { allowed, current, limit } = await annasArchive.canDownloadToday();
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
			processAnnasArchiveDownload(downloadId, download.annasArchiveMd5, download.fileType).catch(
				(error) => {
					logger.error('Retry download failed', error instanceof Error ? error : undefined, {
						downloadId
					});
				}
			);

			return { success: true };
		} else if (download.downloadSource === 'prowlarr') {
			// Retry SABnzbd download
			if (!download.sabnzbdNzoId) {
				return { success: false, error: 'Missing SABnzbd job ID' };
			}

			// Try to retry in SABnzbd
			const retried = await sabnzbd.retryDownload(download.sabnzbdNzoId);

			if (retried) {
				await db
					.update(downloads)
					.set({
						downloadStatus: 'downloading',
						errorMessage: null
					})
					.where(eq(downloads.id, downloadId));

				return { success: true };
			}

			return { success: false, error: 'Failed to retry SABnzbd download' };
		}

		return { success: false, error: 'Unknown download source' };
	} catch (error) {
		logger.error('Error retrying download', error instanceof Error ? error : undefined, {
			downloadId
		});
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}
