import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testNotifications } from '$lib/server/notifications';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ locals }) => {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const results = await testNotifications();
		return json(results);
	} catch (error) {
		logger.error('Error testing notifications', error instanceof Error ? error : undefined);
		return json({ error: 'Failed to test notifications' }, { status: 500 });
	}
};
