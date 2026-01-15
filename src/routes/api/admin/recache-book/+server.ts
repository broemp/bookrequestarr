import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBookDetails } from '$lib/server/hardcover';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { hardcoverId } = await request.json();

		if (!hardcoverId) {
			return json({ error: 'Hardcover ID is required' }, { status: 400 });
		}

		logger.info('Re-caching book', { hardcoverId });

		// Fetch and cache the book (this will update authors, tags, etc.)
		const book = await getBookDetails(hardcoverId);

		if (!book) {
			return json({ error: 'Book not found' }, { status: 404 });
		}

		logger.info('Book re-cached successfully', { hardcoverId, title: book.title });

		return json({
			success: true,
			message: `Book "${book.title}" re-cached successfully`
		});
	} catch (error) {
		logger.error('Error re-caching book', error);
		return json({ error: 'Failed to re-cache book' }, { status: 500 });
	}
};
