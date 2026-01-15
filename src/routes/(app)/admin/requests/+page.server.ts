import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	requests,
	books,
	users,
	bookAuthors,
	authors,
	downloads,
	settings
} from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { sendNotification, formatRequestUpdateNotification } from '$lib/server/notifications';
import { logger } from '$lib/server/logger';
import { initiateDownload } from '$lib/server/downloader';
import { isApiKeyConfigured } from '$lib/server/annasarchive';

export const load: PageServerLoad = async () => {
	// Check if Anna's Archive is enabled (API key is configured)
	const annasArchiveEnabled = await isApiKeyConfigured();

	const [calibreBaseUrlSetting] = await db
		.select()
		.from(settings)
		.where(eq(settings.key, 'calibre_base_url'))
		.limit(1);

	const calibreBaseUrl = calibreBaseUrlSetting?.value || null;

	// Get all requests with book and user details
	const allRequests = await db
		.select({
			id: requests.id,
			status: requests.status,
			language: requests.language,
			specialNotes: requests.specialNotes,
			createdAt: requests.createdAt,
			updatedAt: requests.updatedAt,
			book: {
				id: books.id,
				hardcoverId: books.hardcoverId,
				title: books.title,
				description: books.description,
				coverImage: books.coverImage,
				isbn13: books.isbn13,
				isbn10: books.isbn10,
				publishDate: books.publishDate,
				pages: books.pages,
				publisher: books.publisher,
				rating: books.rating,
				ratingCount: books.ratingCount,
				cachedAt: books.cachedAt,
				author: sql<string>`(
					SELECT GROUP_CONCAT(a.name, ', ')
					FROM book_authors ba
					JOIN authors a ON ba.author_id = a.id
					WHERE ba.book_id = ${books.id}
				)`
			},
			user: {
				id: users.id,
				displayName: users.displayName,
				email: users.email
			}
		})
		.from(requests)
		.innerJoin(books, eq(requests.bookId, books.id))
		.innerJoin(users, eq(requests.userId, users.id))
		.orderBy(desc(requests.createdAt));

	// Get download info for each request
	const requestsWithDownloads = await Promise.all(
		allRequests.map(async (request) => {
			const [download] = await db
				.select()
				.from(downloads)
				.where(eq(downloads.requestId, request.id))
				.orderBy(desc(downloads.createdAt))
				.limit(1);

			return {
				...request,
				download: download || null
			};
		})
	);

	return {
		requests: requestsWithDownloads,
		annasArchiveEnabled,
		calibreBaseUrl
	};
};

export const actions: Actions = {
	updateStatus: async ({ request }) => {
		const formData = await request.formData();
		const requestId = formData.get('requestId') as string;
		const status = formData.get('status') as string;

		if (!requestId || !status) {
			return fail(400, { error: 'Missing required fields' });
		}

		if (!['approved', 'rejected', 'completed'].includes(status)) {
			return fail(400, { error: 'Invalid status' });
		}

		try {
			// Update request status
			await db
				.update(requests)
				.set({
					status: status as 'approved' | 'rejected' | 'completed',
					updatedAt: new Date()
				})
				.where(eq(requests.id, requestId));

			// If status is approved, check if auto-download should be triggered
			if (status === 'approved') {
				const shouldAutoDownload = await checkAutoDownload(requestId);
				if (shouldAutoDownload) {
					logger.info('Triggering auto-download for approved request', { requestId });
					// Trigger download asynchronously (don't wait for it)
					initiateDownload(requestId).catch((error) => {
						logger.error('Auto-download failed', error instanceof Error ? error : undefined, {
							requestId
						});
					});
				}
			}

			// Get request details for notification
			const [requestDetails] = await db
				.select({
					book: books,
					user: users
				})
				.from(requests)
				.innerJoin(books, eq(requests.bookId, books.id))
				.innerJoin(users, eq(requests.userId, users.id))
				.where(eq(requests.id, requestId))
				.limit(1);

			// Send notification to user
			if (requestDetails) {
				await sendNotification(
					'request_updated',
					formatRequestUpdateNotification({
						bookTitle: requestDetails.book.title,
						status
					})
				);
			}

			return { success: true };
		} catch (error) {
			logger.error('Error updating request status', error instanceof Error ? error : undefined, {
				requestId
			});
			return fail(500, { error: 'Failed to update request status' });
		}
	}
};

/**
 * Check if auto-download should be triggered for a request
 */
async function checkAutoDownload(requestId: string): Promise<boolean> {
	try {
		// Check if Anna's Archive is enabled
		const [annasArchiveEnabledSetting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'annas_archive_enabled'))
			.limit(1);

		if (annasArchiveEnabledSetting?.value !== 'true') {
			return false;
		}

		// Check if API key is configured
		const apiKeyConfigured = await isApiKeyConfigured();
		if (!apiKeyConfigured) {
			return false;
		}

		// Get auto-download mode
		const [autoModeSetting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_auto_mode'))
			.limit(1);

		const autoMode = autoModeSetting?.value || 'disabled';

		if (autoMode === 'disabled') {
			return false;
		}

		if (autoMode === 'all_users') {
			return true;
		}

		if (autoMode === 'selected_users') {
			// Get the user for this request
			const [request] = await db
				.select({
					userId: requests.userId
				})
				.from(requests)
				.where(eq(requests.id, requestId))
				.limit(1);

			if (!request) {
				return false;
			}

			// Check if user has auto-download enabled
			const [user] = await db
				.select({
					autoDownloadEnabled: users.autoDownloadEnabled
				})
				.from(users)
				.where(eq(users.id, request.userId))
				.limit(1);

			return user?.autoDownloadEnabled === true;
		}

		return false;
	} catch (error) {
		logger.error('Error checking auto-download', error instanceof Error ? error : undefined, {
			requestId
		});
		return false;
	}
}
