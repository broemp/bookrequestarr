import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDownloadStatus } from '$lib/server/downloader';
import { logger } from '$lib/server/logger';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { requestId } = params;

		if (!requestId) {
			return json({ error: 'Request ID is required' }, { status: 400 });
		}

		const download = await getDownloadStatus(requestId);

		if (!download) {
			return json({ status: null });
		}

		return json({
			status: download.downloadStatus,
			filePath: download.filePath,
			fileSize: download.fileSize,
			fileType: download.fileType,
			errorMessage: download.errorMessage,
			downloadedAt: download.downloadedAt
		});
	} catch (error) {
		logger.error('Error getting download status', error instanceof Error ? error : undefined);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to get download status' },
			{ status: 500 }
		);
	}
};
