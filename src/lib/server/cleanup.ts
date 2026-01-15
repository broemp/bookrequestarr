import { db } from './db';
import { downloads } from './db/schema';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { logger } from './logger';
import { isCalibreEnabled, getCleanupSettings } from './calibre';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Clean up old downloaded files (for Calibre-Web integration)
 */
export async function cleanupOldDownloads(): Promise<number> {
	// Only run if Calibre is enabled
	const calibreEnabled = await isCalibreEnabled();
	if (!calibreEnabled) {
		return 0;
	}

	const { enabled, hours } = await getCleanupSettings();
	if (!enabled) {
		return 0;
	}

	logger.info('Starting cleanup of old downloads', { hours });

	// Calculate cutoff time
	const cutoffTime = new Date();
	cutoffTime.setHours(cutoffTime.getHours() - hours);

	// Find completed downloads older than cutoff with file paths
	const oldDownloads = await db
		.select()
		.from(downloads)
		.where(
			and(
				eq(downloads.downloadStatus, 'completed'),
				lt(downloads.downloadedAt, cutoffTime),
				isNotNull(downloads.filePath)
			)
		);

	let deletedCount = 0;

	for (const download of oldDownloads) {
		if (!download.filePath) continue;

		try {
			// Check if file still exists
			if (existsSync(download.filePath)) {
				await unlink(download.filePath);
				logger.info('Deleted old download file', {
					downloadId: download.id,
					filePath: download.filePath
				});
				deletedCount++;
			}

			// Clear file path from database (file is gone either way)
			await db.update(downloads).set({ filePath: null }).where(eq(downloads.id, download.id));
		} catch (error) {
			logger.error('Error deleting download file', error instanceof Error ? error : undefined, {
				downloadId: download.id,
				filePath: download.filePath
			});
		}
	}

	logger.info('Cleanup completed', { deletedCount });
	return deletedCount;
}
