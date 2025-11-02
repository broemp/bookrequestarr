import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requests, books } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { hardcoverIds } = await request.json();

		if (!hardcoverIds || !Array.isArray(hardcoverIds) || hardcoverIds.length === 0) {
			return json({ requestedBooks: [] });
		}

		// Get all books with these hardcover IDs
		const booksInDb = await db
			.select({ id: books.id, hardcoverId: books.hardcoverId })
			.from(books)
			.where(inArray(books.hardcoverId, hardcoverIds));

		if (booksInDb.length === 0) {
			return json({ requestedBooks: [] });
		}

		const bookIds = booksInDb.map((b) => b.id);

		// Check which of these books have been requested and in what languages
		const requestedBooks = await db
			.select({ bookId: requests.bookId, language: requests.language })
			.from(requests)
			.where(inArray(requests.bookId, bookIds));

		// Map back to hardcover IDs with languages
		const bookLanguageMap: Record<string, string[]> = {};
		
		for (const req of requestedBooks) {
			const book = booksInDb.find((b) => b.id === req.bookId);
			if (book) {
				if (!bookLanguageMap[book.hardcoverId]) {
					bookLanguageMap[book.hardcoverId] = [];
				}
				bookLanguageMap[book.hardcoverId].push(req.language || 'Any');
			}
		}

		return json({ requestedBooks: bookLanguageMap });
	} catch (error) {
		console.error('Error checking requested books:', error);
		return json({ error: 'Failed to check requested books' }, { status: 500 });
	}
};

