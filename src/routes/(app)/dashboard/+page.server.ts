import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requests, books, bookAuthors, authors } from '$lib/server/db/schema';
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

	// Get recent requests with book details and authors
	const recentRequests = await db
		.select({
			id: requests.id,
			status: requests.status,
			createdAt: requests.createdAt,
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
			}
		})
		.from(requests)
		.innerJoin(books, eq(requests.bookId, books.id))
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
