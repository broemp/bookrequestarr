/**
 * Compatibility layer for the download orchestrator
 *
 * This module re-exports functions from downloadOrchestrator.ts and provides
 * backward-compatible wrappers for legacy API endpoints.
 *
 * @deprecated Most functions are now in downloadOrchestrator.ts
 */

import { db } from './db';
import { bookAuthors, authors } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from './logger';
import type { Book } from '$lib/types/book';
import type { AnnasArchiveSearchResult } from '$lib/types/download';
import { searchByIsbn, searchByTitleAuthor } from './annasarchive';

// Re-export main functions from downloadOrchestrator
export {
	initiateDownload,
	getDownloadStatus,
	retryDownload,
	updateSabnzbdDownloadStatuses,
	getActiveSabnzbdDownloads,
	type DownloadOrchestrationResult,
	type InitiateDownloadOptions
} from './downloadOrchestrator';

// ============================================================================
// Legacy Functions (for backward compatibility with existing API endpoints)
// ============================================================================

/**
 * Search for book on Anna's Archive using ISBN first, then title/author
 *
 * @deprecated This function is kept for backward compatibility with the search API endpoint.
 * New code should use the orchestrator's internal search logic.
 */
export async function searchForBook(
	book: Book
): Promise<{ results: AnnasArchiveSearchResult[]; method: 'isbn' | 'title_author' }> {
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
 *
 * @deprecated This function is kept for backward compatibility.
 * The orchestrator has its own file selection logic.
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
