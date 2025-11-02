import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchBooks } from '$lib/server/hardcover';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Require authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
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
		console.error('Error searching books:', error);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
