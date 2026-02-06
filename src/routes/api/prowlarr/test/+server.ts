import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testConnection } from '$lib/server/prowlarr';
import { logger } from '$lib/server/logger';

/**
 * Test Prowlarr connection
 */
export const POST: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	// Check admin role
	if (locals.user.role !== 'admin') {
		return json({ success: false, error: 'Forbidden' }, { status: 403 });
	}

	logger.info('Testing Prowlarr connection', { userId: locals.user.id });

	try {
		const result = await testConnection();

		if (result.success) {
			logger.info('Prowlarr connection test successful', { userId: locals.user.id });
			return json({ success: true });
		} else {
			logger.warn('Prowlarr connection test failed', {
				userId: locals.user.id,
				error: result.error
			});
			return json({ success: false, error: result.error });
		}
	} catch (error) {
		logger.error('Error testing Prowlarr connection', error instanceof Error ? error : undefined, {
			userId: locals.user.id
		});
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
