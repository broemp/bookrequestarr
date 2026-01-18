import { db } from './db';
import { settings } from './db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { env } from '$env/dynamic/private';

// ============================================================================
// Types
// ============================================================================

/** SABnzbd queue slot status */
export type SABnzbdSlotStatus =
	| 'Queued'
	| 'Downloading'
	| 'Paused'
	| 'Grabbing'
	| 'Fetching'
	| 'Verifying'
	| 'Repairing'
	| 'Extracting';

/** SABnzbd history slot status */
export type SABnzbdHistoryStatus = 'Completed' | 'Failed' | 'Extracting' | 'Moving' | 'Running';

/** A single slot in the SABnzbd queue */
export interface SABnzbdQueueSlot {
	nzo_id: string;
	filename: string;
	status: SABnzbdSlotStatus;
	percentage: string;
	mb: string;
	mbleft: string;
	size: string;
	sizeleft: string;
	timeleft: string;
	eta: string;
	category: string;
	priority: string;
	avg_age: string;
}

/** A single slot in the SABnzbd history */
export interface SABnzbdHistorySlot {
	nzo_id: string;
	name: string;
	status: SABnzbdHistoryStatus;
	category: string;
	size: string;
	bytes: number;
	storage: string;
	path: string;
	completed: number; // Unix timestamp
	download_time: number;
	postproc_time: number;
	fail_message?: string;
	script_log?: string;
}

/** SABnzbd queue response */
export interface SABnzbdQueueResponse {
	queue: {
		status: string;
		paused: boolean;
		speedlimit: string;
		speed: string;
		mbleft: string;
		mb: string;
		timeleft: string;
		noofslots: number;
		slots: SABnzbdQueueSlot[];
	};
}

/** SABnzbd history response */
export interface SABnzbdHistoryResponse {
	history: {
		noofslots: number;
		day_size: string;
		week_size: string;
		month_size: string;
		total_size: string;
		slots: SABnzbdHistorySlot[];
	};
}

/** SABnzbd add NZB response */
export interface SABnzbdAddResponse {
	status: boolean;
	nzo_ids: string[];
	error?: string;
}

/** SABnzbd delete response */
export interface SABnzbdDeleteResponse {
	status: boolean;
	error?: string;
}

/** SABnzbd version response */
export interface SABnzbdVersionResponse {
	version: string;
}

/** Unified download status for tracking */
export interface SABnzbdDownloadStatus {
	nzo_id: string;
	name: string;
	status: 'queued' | 'downloading' | 'paused' | 'processing' | 'completed' | 'failed';
	progress: number; // 0-100
	size: number; // bytes
	sizeLeft: number; // bytes
	timeLeft: string;
	category: string;
	/** Path to completed download (only available after completion) */
	storagePath?: string;
	/** Error message if failed */
	errorMessage?: string;
}

/** SABnzbd configuration */
export interface SABnzbdConfig {
	url: string;
	apiKey: string;
	category: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get SABnzbd URL from settings or environment
 */
async function getSabnzbdUrl(): Promise<string | null> {
	try {
		// First check environment variable
		if (env.SABNZBD_URL) {
			return env.SABNZBD_URL;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'sabnzbd_url'))
			.limit(1);

		return setting?.value || null;
	} catch (error) {
		logger.error('Error fetching SABnzbd URL', error instanceof Error ? error : undefined);
		return null;
	}
}

/**
 * Get SABnzbd API key from settings or environment
 */
async function getSabnzbdApiKey(): Promise<string | null> {
	try {
		// First check environment variable
		if (env.SABNZBD_API_KEY) {
			return env.SABNZBD_API_KEY;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'sabnzbd_api_key'))
			.limit(1);

		return setting?.value || null;
	} catch (error) {
		logger.error('Error fetching SABnzbd API key', error instanceof Error ? error : undefined);
		return null;
	}
}

/**
 * Get SABnzbd download category from settings or environment
 */
async function getSabnzbdCategory(): Promise<string> {
	const DEFAULT_CATEGORY = 'books';

	try {
		// First check environment variable
		if (env.SABNZBD_CATEGORY) {
			return env.SABNZBD_CATEGORY;
		}

		// Then check database settings
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'sabnzbd_category'))
			.limit(1);

		return setting?.value || DEFAULT_CATEGORY;
	} catch (error) {
		logger.error('Error fetching SABnzbd category', error instanceof Error ? error : undefined);
		return DEFAULT_CATEGORY;
	}
}

/**
 * Get full SABnzbd configuration
 */
export async function getSabnzbdConfig(): Promise<SABnzbdConfig | null> {
	const url = await getSabnzbdUrl();
	const apiKey = await getSabnzbdApiKey();
	const category = await getSabnzbdCategory();

	if (!url || !apiKey) {
		return null;
	}

	return { url, apiKey, category };
}

/**
 * Check if SABnzbd is configured
 */
export async function isSabnzbdConfigured(): Promise<boolean> {
	const config = await getSabnzbdConfig();
	return config !== null;
}

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Make a request to the SABnzbd API
 */
async function sabnzbdRequest<T>(
	mode: string,
	params: Record<string, string> = {}
): Promise<T> {
	const config = await getSabnzbdConfig();
	if (!config) {
		throw new Error('SABnzbd is not configured');
	}

	// Normalize URL (remove trailing slash)
	const baseUrl = config.url.replace(/\/$/, '');

	// Build query params
	const queryParams = new URLSearchParams({
		mode,
		output: 'json',
		apikey: config.apiKey,
		...params
	});

	const requestUrl = `${baseUrl}/api?${queryParams}`;

	logger.debug('SABnzbd API request', { mode, params: Object.keys(params) });

	try {
		const response = await fetch(requestUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`SABnzbd API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Check for API-level errors
		if (data.error) {
			throw new Error(`SABnzbd API error: ${data.error}`);
		}

		return data as T;
	} catch (error) {
		logger.error('SABnzbd API request failed', error instanceof Error ? error : undefined, {
			mode,
			url: baseUrl
		});
		throw error;
	}
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Test connection to SABnzbd
 * @returns SABnzbd version if successful
 */
export async function testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
	try {
		const response = await sabnzbdRequest<SABnzbdVersionResponse>('version');
		logger.info('SABnzbd connection test successful', { version: response.version });
		return { success: true, version: response.version };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error('SABnzbd connection test failed', error instanceof Error ? error : undefined);
		return { success: false, error: errorMessage };
	}
}

/**
 * Add an NZB by URL to SABnzbd
 * @param nzbUrl - URL to the NZB file
 * @param name - Optional name for the download
 * @param category - Optional category override (uses default if not specified)
 * @param priority - Download priority (-1=low, 0=normal, 1=high, 2=force)
 * @returns The nzo_id of the added download
 */
export async function addNzbByUrl(
	nzbUrl: string,
	name?: string,
	category?: string,
	priority: number = 0
): Promise<string> {
	const defaultCategory = await getSabnzbdCategory();
	const downloadCategory = category || defaultCategory;

	const params: Record<string, string> = {
		name: nzbUrl,
		cat: downloadCategory,
		priority: priority.toString()
	};

	if (name) {
		params.nzbname = name;
	}

	logger.info('Adding NZB to SABnzbd', {
		category: downloadCategory,
		priority,
		hasCustomName: !!name
	});

	const response = await sabnzbdRequest<SABnzbdAddResponse>('addurl', params);

	if (!response.status || !response.nzo_ids || response.nzo_ids.length === 0) {
		const errorMsg = response.error || 'Failed to add NZB to SABnzbd';
		logger.error('Failed to add NZB to SABnzbd', undefined, { error: errorMsg });
		throw new Error(errorMsg);
	}

	const nzoId = response.nzo_ids[0];
	logger.info('NZB added to SABnzbd successfully', { nzoId, category: downloadCategory });

	return nzoId;
}

/**
 * Add an NZB by file content to SABnzbd (for direct NZB data)
 * @param nzbContent - Base64 encoded NZB content
 * @param name - Name for the download
 * @param category - Optional category override
 * @param priority - Download priority
 */
export async function addNzbByContent(
	nzbContent: string,
	name: string,
	category?: string,
	priority: number = 0
): Promise<string> {
	const defaultCategory = await getSabnzbdCategory();
	const downloadCategory = category || defaultCategory;

	const config = await getSabnzbdConfig();
	if (!config) {
		throw new Error('SABnzbd is not configured');
	}

	const baseUrl = config.url.replace(/\/$/, '');

	// For file uploads, we need to use POST with multipart form data
	const formData = new FormData();
	formData.append('mode', 'addfile');
	formData.append('output', 'json');
	formData.append('apikey', config.apiKey);
	formData.append('nzbname', name);
	formData.append('cat', downloadCategory);
	formData.append('priority', priority.toString());

	// Create a blob from the NZB content
	const nzbBlob = new Blob([Buffer.from(nzbContent, 'base64')], {
		type: 'application/x-nzb'
	});
	formData.append('nzbfile', nzbBlob, `${name}.nzb`);

	logger.info('Adding NZB content to SABnzbd', {
		name,
		category: downloadCategory,
		priority
	});

	try {
		const response = await fetch(`${baseUrl}/api`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`SABnzbd API error: ${response.status} ${response.statusText}`);
		}

		const data: SABnzbdAddResponse = await response.json();

		if (!data.status || !data.nzo_ids || data.nzo_ids.length === 0) {
			const errorMsg = data.error || 'Failed to add NZB content to SABnzbd';
			throw new Error(errorMsg);
		}

		const nzoId = data.nzo_ids[0];
		logger.info('NZB content added to SABnzbd successfully', { nzoId, name });

		return nzoId;
	} catch (error) {
		logger.error('Failed to add NZB content to SABnzbd', error instanceof Error ? error : undefined);
		throw error;
	}
}

/**
 * Get the current download queue
 * @param limit - Maximum number of slots to return
 */
export async function getQueue(limit?: number): Promise<SABnzbdQueueSlot[]> {
	const params: Record<string, string> = {};
	if (limit) {
		params.limit = limit.toString();
	}

	const response = await sabnzbdRequest<SABnzbdQueueResponse>('queue', params);

	logger.debug('SABnzbd queue retrieved', {
		totalSlots: response.queue.noofslots,
		returnedSlots: response.queue.slots.length
	});

	return response.queue.slots;
}

/**
 * Get download history
 * @param limit - Maximum number of slots to return
 */
export async function getHistory(limit?: number): Promise<SABnzbdHistorySlot[]> {
	const params: Record<string, string> = {};
	if (limit) {
		params.limit = limit.toString();
	}

	const response = await sabnzbdRequest<SABnzbdHistoryResponse>('history', params);

	logger.debug('SABnzbd history retrieved', {
		totalSlots: response.history.noofslots,
		returnedSlots: response.history.slots.length
	});

	return response.history.slots;
}

/**
 * Get status of a specific download by nzo_id
 * Checks both queue and history
 */
export async function getDownloadStatus(nzoId: string): Promise<SABnzbdDownloadStatus | null> {
	logger.debug('Getting download status', { nzoId });

	// First check the queue
	const queue = await getQueue();
	const queueSlot = queue.find((slot) => slot.nzo_id === nzoId);

	if (queueSlot) {
		const totalMb = parseFloat(queueSlot.mb);
		const leftMb = parseFloat(queueSlot.mbleft);
		const progress = totalMb > 0 ? Math.round(((totalMb - leftMb) / totalMb) * 100) : 0;

		// Map SABnzbd status to unified status
		let status: SABnzbdDownloadStatus['status'];
		switch (queueSlot.status) {
			case 'Downloading':
				status = 'downloading';
				break;
			case 'Paused':
				status = 'paused';
				break;
			case 'Verifying':
			case 'Repairing':
			case 'Extracting':
				status = 'processing';
				break;
			default:
				status = 'queued';
		}

		return {
			nzo_id: nzoId,
			name: queueSlot.filename,
			status,
			progress,
			size: Math.round(totalMb * 1024 * 1024),
			sizeLeft: Math.round(leftMb * 1024 * 1024),
			timeLeft: queueSlot.timeleft,
			category: queueSlot.category
		};
	}

	// Check history if not in queue
	const history = await getHistory(100); // Get last 100 items
	const historySlot = history.find((slot) => slot.nzo_id === nzoId);

	if (historySlot) {
		const isFailed = historySlot.status === 'Failed';

		return {
			nzo_id: nzoId,
			name: historySlot.name,
			status: isFailed ? 'failed' : 'completed',
			progress: isFailed ? 0 : 100,
			size: historySlot.bytes,
			sizeLeft: 0,
			timeLeft: '0:00:00',
			category: historySlot.category,
			storagePath: isFailed ? undefined : historySlot.storage,
			errorMessage: isFailed ? historySlot.fail_message : undefined
		};
	}

	logger.warn('Download not found in queue or history', { nzoId });
	return null;
}

/**
 * Delete a download from queue or history
 * @param nzoId - The nzo_id of the download to delete
 * @param deleteFiles - Whether to delete downloaded files (for completed downloads)
 */
export async function deleteDownload(nzoId: string, deleteFiles: boolean = false): Promise<boolean> {
	logger.info('Deleting download from SABnzbd', { nzoId, deleteFiles });

	// Try to remove from queue first
	try {
		const queueResponse = await sabnzbdRequest<SABnzbdDeleteResponse>('queue', {
			name: 'delete',
			value: nzoId,
			del_files: deleteFiles ? '1' : '0'
		});

		if (queueResponse.status) {
			logger.info('Download removed from SABnzbd queue', { nzoId });
			return true;
		}
	} catch {
		// Not in queue, try history
	}

	// Try to remove from history
	try {
		const historyResponse = await sabnzbdRequest<SABnzbdDeleteResponse>('history', {
			name: 'delete',
			value: nzoId,
			del_files: deleteFiles ? '1' : '0'
		});

		if (historyResponse.status) {
			logger.info('Download removed from SABnzbd history', { nzoId });
			return true;
		}
	} catch {
		// Not found in history either
	}

	logger.warn('Download not found in SABnzbd queue or history', { nzoId });
	return false;
}

/**
 * Pause a specific download
 */
export async function pauseDownload(nzoId: string): Promise<boolean> {
	logger.info('Pausing download', { nzoId });

	try {
		await sabnzbdRequest('queue', {
			name: 'pause',
			value: nzoId
		});
		logger.info('Download paused', { nzoId });
		return true;
	} catch (error) {
		logger.error('Failed to pause download', error instanceof Error ? error : undefined, { nzoId });
		return false;
	}
}

/**
 * Resume a specific download
 */
export async function resumeDownload(nzoId: string): Promise<boolean> {
	logger.info('Resuming download', { nzoId });

	try {
		await sabnzbdRequest('queue', {
			name: 'resume',
			value: nzoId
		});
		logger.info('Download resumed', { nzoId });
		return true;
	} catch (error) {
		logger.error('Failed to resume download', error instanceof Error ? error : undefined, { nzoId });
		return false;
	}
}

/**
 * Retry a failed download from history
 */
export async function retryDownload(nzoId: string): Promise<boolean> {
	logger.info('Retrying failed download', { nzoId });

	try {
		await sabnzbdRequest('retry', {
			value: nzoId
		});
		logger.info('Download retry initiated', { nzoId });
		return true;
	} catch (error) {
		logger.error('Failed to retry download', error instanceof Error ? error : undefined, { nzoId });
		return false;
	}
}

/**
 * Get downloads by category
 * Returns both queue and history items for the specified category
 */
export async function getDownloadsByCategory(category?: string): Promise<SABnzbdDownloadStatus[]> {
	const targetCategory = category || (await getSabnzbdCategory());

	logger.debug('Getting downloads by category', { category: targetCategory });

	const [queue, history] = await Promise.all([getQueue(), getHistory(100)]);

	const results: SABnzbdDownloadStatus[] = [];

	// Process queue items
	for (const slot of queue) {
		if (slot.category === targetCategory) {
			const totalMb = parseFloat(slot.mb);
			const leftMb = parseFloat(slot.mbleft);
			const progress = totalMb > 0 ? Math.round(((totalMb - leftMb) / totalMb) * 100) : 0;

			let status: SABnzbdDownloadStatus['status'];
			switch (slot.status) {
				case 'Downloading':
					status = 'downloading';
					break;
				case 'Paused':
					status = 'paused';
					break;
				case 'Verifying':
				case 'Repairing':
				case 'Extracting':
					status = 'processing';
					break;
				default:
					status = 'queued';
			}

			results.push({
				nzo_id: slot.nzo_id,
				name: slot.filename,
				status,
				progress,
				size: Math.round(totalMb * 1024 * 1024),
				sizeLeft: Math.round(leftMb * 1024 * 1024),
				timeLeft: slot.timeleft,
				category: slot.category
			});
		}
	}

	// Process history items
	for (const slot of history) {
		if (slot.category === targetCategory) {
			const isFailed = slot.status === 'Failed';

			results.push({
				nzo_id: slot.nzo_id,
				name: slot.name,
				status: isFailed ? 'failed' : 'completed',
				progress: isFailed ? 0 : 100,
				size: slot.bytes,
				sizeLeft: 0,
				timeLeft: '0:00:00',
				category: slot.category,
				storagePath: isFailed ? undefined : slot.storage,
				errorMessage: isFailed ? slot.fail_message : undefined
			});
		}
	}

	logger.debug('Downloads by category retrieved', {
		category: targetCategory,
		count: results.length
	});

	return results;
}

/**
 * Pause the entire SABnzbd queue
 */
export async function pauseQueue(): Promise<boolean> {
	logger.info('Pausing SABnzbd queue');

	try {
		await sabnzbdRequest('pause');
		logger.info('SABnzbd queue paused');
		return true;
	} catch (error) {
		logger.error('Failed to pause SABnzbd queue', error instanceof Error ? error : undefined);
		return false;
	}
}

/**
 * Resume the entire SABnzbd queue
 */
export async function resumeQueue(): Promise<boolean> {
	logger.info('Resuming SABnzbd queue');

	try {
		await sabnzbdRequest('resume');
		logger.info('SABnzbd queue resumed');
		return true;
	} catch (error) {
		logger.error('Failed to resume SABnzbd queue', error instanceof Error ? error : undefined);
		return false;
	}
}
