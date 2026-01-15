import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requests, books } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { searchForBook } from '$lib/server/downloader';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication and admin role
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (locals.user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const { requestId } = await request.json();

		if (!requestId) {
			return json({ error: 'Request ID is required' }, { status: 400 });
		}

		// Get request and book details
		const [requestData] = await db
			.select({
				request: requests,
				book: books
			})
			.from(requests)
			.innerJoin(books, eq(requests.bookId, books.id))
			.where(eq(requests.id, requestId))
			.limit(1);

		if (!requestData) {
			return json({ error: 'Request not found' }, { status: 404 });
		}

		// Search for book on Anna's Archive
		const searchResult = await searchForBook(requestData.book);

		logger.info('Book search completed', { requestId, resultsCount: searchResult.results.length });

		return json({
			results: searchResult.results,
			searchMethod: searchResult.method
		});
	} catch (error) {
		logger.error('Error searching for book', error instanceof Error ? error : undefined);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to search for book' },
			{ status: 500 }
		);
	}
};
