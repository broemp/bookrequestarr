import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBookDetails } from '$lib/server/hardcover';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const bookDetails = await getBookDetails(params.id);

		if (!bookDetails) {
			return json({ error: 'Book not found' }, { status: 404 });
		}

		// The book is now cached, get the database ID
		const { db } = await import('$lib/server/db');
		const { books } = await import('$lib/server/db/schema');
		const { eq } = await import('drizzle-orm');
		const { logger } = await import('$lib/server/logger');

		const [cachedBook] = await db
			.select({ id: books.id })
			.from(books)
			.where(eq(books.hardcoverId, params.id))
			.limit(1);

		if (!cachedBook) {
			logger.warn('Book was fetched but not found in cache, returning without dbId', { hardcoverId: params.id });
			return json({
				...bookDetails,
				dbId: null // No database ID available
			});
		}

		logger.info('Book details retrieved with dbId', { hardcoverId: params.id, dbId: cachedBook.id });

		return json({
			...bookDetails,
			dbId: cachedBook.id // Add database ID for request creation
		});
	} catch (error) {
		console.error('Error fetching book details:', error);
		return json({ error: 'Failed to fetch book details' }, { status: 500 });
	}
};
