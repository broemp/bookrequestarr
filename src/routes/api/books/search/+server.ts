import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBooks } from '$lib/server/hardcover';
import { logger } from '$lib/server/logger';
import { applyRateLimit } from '$lib/server/rateLimitMiddleware';
import { RATE_LIMITS } from '$lib/server/rateLimit';

export const GET: RequestHandler = async (event) => {
	const { url, locals } = event;

	// Require authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Apply rate limiting
	const rateLimitResponse = applyRateLimit(event, RATE_LIMITS.SEARCH);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const query = url.searchParams.get('q');
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? parseInt(limitParam, 10) : 20;

	if (!query || query.length < 2) {
		return json([]);
	}

	try {
		const results = await searchBooks(query, limit);
		return json(results);
	} catch (error) {
		logger.error('Error searching books', error instanceof Error ? error : undefined, {
			query,
			limit
		});
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
