import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBooksBySeries } from '$lib/server/hardcover';
import { logger } from '$lib/server/logger';

export const GET: RequestHandler = async ({ params }) => {
	const seriesId = params.id;

	if (!seriesId) {
		return json({ error: 'Series ID is required' }, { status: 400 });
	}

	try {
		const books = await getBooksBySeries(seriesId);
		return json(books);
	} catch (error) {
		logger.error('Error fetching series books', error instanceof Error ? error : undefined, { seriesId });
		return json({ error: 'Failed to fetch series books' }, { status: 500 });
	}
};

