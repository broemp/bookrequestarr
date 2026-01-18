import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateSabnzbdDownloadStatuses } from '$lib/server/downloadOrchestrator';
import { logger } from '$lib/server/logger';

/**
 * POST /api/downloads/poll
 * Manually trigger SABnzbd status polling
 * Admin only endpoint for on-demand status updates
 */
export const POST: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Only admins can manually trigger polling
	if (locals.user.role !== 'admin') {
		return json({ error: 'Forbidden: Admin access required' }, { status: 403 });
	}

	try {
		logger.info('Manual SABnzbd status poll triggered', { userId: locals.user.id });

		await updateSabnzbdDownloadStatuses();

		return json({
			success: true,
			message: 'SABnzbd status polling completed'
		});
	} catch (error) {
		logger.error('Manual SABnzbd status poll failed', error instanceof Error ? error : undefined, {
			userId: locals.user.id
		});
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to poll SABnzbd status'
			},
			{ status: 500 }
		);
	}
};
