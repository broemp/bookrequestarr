/**
 * Test script for SABnzbd status polling
 *
 * This script tests the SABnzbd status polling functionality by:
 * 1. Checking if SABnzbd is configured
 * 2. Getting active downloads
 * 3. Running a status update cycle
 * 4. Displaying results
 *
 * Usage:
 *   npx tsx scripts/test-sabnzbd-polling.ts
 */

import {
	updateSabnzbdDownloadStatuses,
	getActiveSabnzbdDownloads
} from '../src/lib/server/downloadOrchestrator';
import { isSabnzbdConfigured, getQueue, getHistory } from '../src/lib/server/sabnzbd';

async function main() {
	console.log('=== SABnzbd Status Polling Test ===\n');

	// Check if SABnzbd is configured
	const isConfigured = await isSabnzbdConfigured();
	console.log(`SABnzbd Configured: ${isConfigured ? '✓' : '✗'}`);

	if (!isConfigured) {
		console.log(
			'\n❌ SABnzbd is not configured. Please configure it in settings or environment variables.'
		);
		process.exit(1);
	}

	// Get SABnzbd queue
	console.log('\n--- SABnzbd Queue ---');
	try {
		const queue = await getQueue();
		console.log(`Queue items: ${queue.length}`);

		if (queue.length > 0) {
			queue.forEach((item, index) => {
				console.log(`  ${index + 1}. ${item.filename}`);
				console.log(`     Status: ${item.status}, Progress: ${item.percentage}%`);
				console.log(`     NZO ID: ${item.nzo_id}`);
			});
		} else {
			console.log('  (empty)');
		}
	} catch (error) {
		console.error('Error getting queue:', error instanceof Error ? error.message : error);
	}

	// Get SABnzbd history
	console.log('\n--- SABnzbd History (last 5) ---');
	try {
		const history = await getHistory(5);
		console.log(`History items: ${history.length}`);

		if (history.length > 0) {
			history.forEach((item, index) => {
				console.log(`  ${index + 1}. ${item.name}`);
				console.log(`     Status: ${item.status}`);
				console.log(`     NZO ID: ${item.nzo_id}`);
				if (item.fail_message) {
					console.log(`     Error: ${item.fail_message}`);
				}
			});
		} else {
			console.log('  (empty)');
		}
	} catch (error) {
		console.error('Error getting history:', error instanceof Error ? error.message : error);
	}

	// Get active downloads from database
	console.log('\n--- Active Downloads (Database) ---');
	try {
		const activeDownloads = await getActiveSabnzbdDownloads();
		console.log(`Active downloads: ${activeDownloads.length}`);

		if (activeDownloads.length > 0) {
			activeDownloads.forEach((download, index) => {
				console.log(`  ${index + 1}. ${download.bookTitle}`);
				console.log(`     Download ID: ${download.downloadId}`);
				console.log(`     NZO ID: ${download.nzoId}`);
				console.log(`     Status: ${download.status}`);
				console.log(`     Indexer: ${download.indexer}`);
				console.log(`     Confidence: ${download.confidenceScore}%`);
			});
		} else {
			console.log('  (no active downloads)');
		}
	} catch (error) {
		console.error(
			'Error getting active downloads:',
			error instanceof Error ? error.message : error
		);
	}

	// Run status update
	console.log('\n--- Running Status Update ---');
	try {
		await updateSabnzbdDownloadStatuses();
		console.log('✓ Status update completed successfully');
	} catch (error) {
		console.error('✗ Status update failed:', error instanceof Error ? error.message : error);
	}

	// Get active downloads again to see changes
	console.log('\n--- Active Downloads (After Update) ---');
	try {
		const activeDownloads = await getActiveSabnzbdDownloads();
		console.log(`Active downloads: ${activeDownloads.length}`);

		if (activeDownloads.length > 0) {
			activeDownloads.forEach((download, index) => {
				console.log(`  ${index + 1}. ${download.bookTitle}`);
				console.log(`     Status: ${download.status}`);
			});
		} else {
			console.log('  (no active downloads)');
		}
	} catch (error) {
		console.error(
			'Error getting active downloads:',
			error instanceof Error ? error.message : error
		);
	}

	console.log('\n=== Test Complete ===');
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
