import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActiveSabnzbdDownloads } from '$lib/server/downloadOrchestrator';
import { logger } from '$lib/server/logger';

/**
 * GET /api/downloads/active
 * Get all active SABnzbd downloads
 * Admin only endpoint for monitoring download progress
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Only admins can view all active downloads
	if (locals.user.role !== 'admin') {
		return json({ error: 'Forbidden: Admin access required' }, { status: 403 });
	}

	try {
		const activeDownloads = await getActiveSabnzbdDownloads();

		return json({
			downloads: activeDownloads,
			count: activeDownloads.length
		});
	} catch (error) {
		logger.error('Error getting active downloads', error instanceof Error ? error : undefined, {
			userId: locals.user.id
		});
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to get active downloads'
			},
			{ status: 500 }
		);
	}
};
