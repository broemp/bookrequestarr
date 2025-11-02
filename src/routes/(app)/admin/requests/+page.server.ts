import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { requests, books, users, bookAuthors, authors } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { sendNotification, formatRequestUpdateNotification } from '$lib/server/notifications';

export const load: PageServerLoad = async () => {
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

	return {
		requests: allRequests
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
			console.error('Error updating request status:', error);
			return fail(500, { error: 'Failed to update request status' });
		}
	}
};
