import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { requests, books, bookAuthors, authors } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	// Get all user requests with book details and authors
	const userRequests = await db
		.select({
			id: requests.id,
			status: requests.status,
			formatType: requests.formatType,
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
			}
		})
		.from(requests)
		.innerJoin(books, eq(requests.bookId, books.id))
		.where(eq(requests.userId, user.id))
		.orderBy(desc(requests.createdAt));

	return {
		requests: userRequests
	};
};
