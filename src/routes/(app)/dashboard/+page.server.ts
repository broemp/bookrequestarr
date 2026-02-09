import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requests, books, downloads } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getTrendingBooks } from '$lib/server/hardcover';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	// Get user's request statistics
	const userRequests = await db.select().from(requests).where(eq(requests.userId, user.id));

	const stats = {
		total: userRequests.length,
		pending: userRequests.filter((r) => r.status === 'pending').length,
		approved: userRequests.filter((r) => r.status === 'approved').length,
		completed: userRequests.filter((r) => r.status === 'completed').length
	};

	// Get recent requests with book details, authors, and download info
	const recentRequests = await db
		.select({
			id: requests.id,
			status: requests.status,
			language: requests.language,
			formatType: requests.formatType,
			specialNotes: requests.specialNotes,
			createdAt: requests.createdAt,
			book: {
				id: books.id,
				hardcoverId: books.hardcoverId,
				title: books.title,
				coverImage: books.coverImage,
				author: sql<string>`(
					SELECT GROUP_CONCAT(a.name, ', ')
					FROM book_authors ba
					JOIN authors a ON ba.author_id = a.id
					WHERE ba.book_id = ${books.id}
				)`
			},
			download: {
				id: downloads.id,
				downloadStatus: downloads.downloadStatus,
				errorMessage: downloads.errorMessage,
				downloadSource: downloads.downloadSource,
				fileType: downloads.fileType,
				fileSize: downloads.fileSize
			}
		})
		.from(requests)
		.innerJoin(books, eq(requests.bookId, books.id))
		.leftJoin(downloads, eq(downloads.requestId, requests.id))
		.where(eq(requests.userId, user.id))
		.orderBy(desc(requests.createdAt))
		.limit(5);

	// Get trending books
	const trendingBooks = await getTrendingBooks(20);

	return {
		user,
		stats,
		recentRequests,
		trendingBooks
	};
};
