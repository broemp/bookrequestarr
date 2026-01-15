import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { retryDownload } from '$lib/server/downloader';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ params, locals }) => {
	// Check authentication and admin role
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (locals.user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const { downloadId } = params;

		if (!downloadId) {
			return json({ error: 'Download ID is required' }, { status: 400 });
		}

		logger.info('Retrying download via API', { downloadId });

		const result = await retryDownload(downloadId);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		return json({ success: true });
	} catch (error) {
		logger.error('Error retrying download', error instanceof Error ? error : undefined);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to retry download' },
			{ status: 500 }
		);
	}
};
