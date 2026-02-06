import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { testConnection } from '$lib/server/sabnzbd';
import { logger } from '$lib/server/logger';

/**
 * Test SABnzbd connection
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

	logger.info('Testing SABnzbd connection', { userId: locals.user.id });

	try {
		const result = await testConnection();

		if (result.success) {
			logger.info('SABnzbd connection test successful', {
				userId: locals.user.id,
				version: result.version
			});
			return json({ success: true, version: result.version });
		} else {
			logger.warn('SABnzbd connection test failed', {
				userId: locals.user.id,
				error: result.error
			});
			return json({ success: false, error: result.error });
		}
	} catch (error) {
		logger.error('Error testing SABnzbd connection', error instanceof Error ? error : undefined, {
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
