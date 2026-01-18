import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { initiateDownload } from '$lib/server/downloader';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication and admin role
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (locals.user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { requestId, md5, fileType, pathIndex, domainIndex, manual, prowlarrGuid, forceSource } = body;

		if (!requestId) {
			return json({ error: 'Request ID is required' }, { status: 400 });
		}

		logger.info('Initiating download via API', { requestId, md5, fileType, prowlarrGuid, forceSource });

		const result = await initiateDownload(requestId, {
			md5,
			fileType,
			pathIndex,
			domainIndex,
			manual,
			prowlarrGuid,
			forceSource
		});

		if (!result.success) {
			if (result.requiresSelection) {
				return json({
					requiresSelection: true,
					annasArchiveResults: result.annasArchiveResults,
					prowlarrResults: result.prowlarrResults
				});
			}

			return json({ error: result.error }, { status: 400 });
		}

		return json({
			success: true,
			downloadId: result.downloadId
		});
	} catch (error) {
		logger.error('Error initiating download', error instanceof Error ? error : undefined);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to initiate download' },
			{ status: 500 }
		);
	}
};
