import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requests, books } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import type { FormatType } from '$lib/types/request';

interface RequestInfo {
	language: string;
	formatType: FormatType;
}

interface BookRequestInfo {
	languages: string[];
	formats: FormatType[];
	requests: RequestInfo[];
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { hardcoverIds } = await request.json();

		if (!hardcoverIds || !Array.isArray(hardcoverIds) || hardcoverIds.length === 0) {
			return json({ requestedBooks: {} });
		}

		// Get all books with these hardcover IDs
		const booksInDb = await db
			.select({ id: books.id, hardcoverId: books.hardcoverId })
			.from(books)
			.where(inArray(books.hardcoverId, hardcoverIds));

		if (booksInDb.length === 0) {
			return json({ requestedBooks: {} });
		}

		const bookIds = booksInDb.map((b) => b.id);

		// Check which of these books have been requested and in what languages/formats
		const requestedBooks = await db
			.select({
				bookId: requests.bookId,
				language: requests.language,
				formatType: requests.formatType
			})
			.from(requests)
			.where(inArray(requests.bookId, bookIds));

		// Map back to hardcover IDs with languages and formats
		const bookRequestMap: Record<string, BookRequestInfo> = {};

		for (const req of requestedBooks) {
			const book = booksInDb.find((b) => b.id === req.bookId);
			if (book) {
				if (!bookRequestMap[book.hardcoverId]) {
					bookRequestMap[book.hardcoverId] = {
						languages: [],
						formats: [],
						requests: []
					};
				}

				const language = req.language || 'Any';
				const formatType = req.formatType as FormatType;

				// Add to requests array (full info)
				bookRequestMap[book.hardcoverId].requests.push({
					language,
					formatType
				});

				// Add unique languages
				if (!bookRequestMap[book.hardcoverId].languages.includes(language)) {
					bookRequestMap[book.hardcoverId].languages.push(language);
				}

				// Add unique formats
				if (!bookRequestMap[book.hardcoverId].formats.includes(formatType)) {
					bookRequestMap[book.hardcoverId].formats.push(formatType);
				}
			}
		}

		return json({ requestedBooks: bookRequestMap });
	} catch (error) {
		logger.error('Error checking requested books', error instanceof Error ? error : undefined);
		return json({ error: 'Failed to check requested books' }, { status: 500 });
	}
};
