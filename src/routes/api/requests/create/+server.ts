import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requests, books, users, bookAuthors, authors } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendNotification, formatRequestNotification } from '$lib/server/notifications';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const formData = await request.formData();
		const bookId = formData.get('bookId') as string;
		const hardcoverId = formData.get('hardcoverId') as string; // Fallback
		const language = formData.get('language') as string;
		const specialNotes = formData.get('specialNotes') as string;

		logger.debug('Creating book request', { bookId, hardcoverId, userId: locals.user.id });

		if (!bookId && !hardcoverId) {
			return new Response('Book ID or Hardcover ID is required', { status: 400 });
		}

		// Try to get book by database ID first, then by Hardcover ID
		let book;
		if (bookId) {
			[book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
		}

		if (!book && hardcoverId) {
			logger.debug('Book not found by dbId, trying hardcoverId', { hardcoverId });
			[book] = await db.select().from(books).where(eq(books.hardcoverId, hardcoverId)).limit(1);
		}

		if (!book) {
			logger.warn('Book not found in database', { bookId, hardcoverId });
			return new Response('Book not found', { status: 404 });
		}

		logger.debug('Found book for request', {
			bookId: book.id,
			hardcoverId: book.hardcoverId,
			title: book.title
		});

		// Verify the user exists
		const [userExists] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);
		if (!userExists) {
			logger.error('User not found in database', undefined, { userId: locals.user.id });
			return new Response('User not found', { status: 404 });
		}

		// Verify the book exists
		const [bookExists] = await db
			.select({ id: books.id })
			.from(books)
			.where(eq(books.id, book.id))
			.limit(1);
		if (!bookExists) {
			logger.error('Book ID does not exist in books table', undefined, { bookId: book.id });
			return new Response('Book ID invalid', { status: 404 });
		}

		logger.debug('User and book verified, creating request');

		// Check if user already has a request for this book in the same language
		const existingRequests = await db.select().from(requests).where(eq(requests.bookId, book.id));

		// Check if there's a request with the same language (or both null)
		const duplicateRequest = existingRequests.find((req) => {
			const reqLang = req.language?.toLowerCase().trim() || null;
			const newLang = language?.toLowerCase().trim() || null;
			return reqLang === newLang;
		});

		if (duplicateRequest) {
			const langMsg = language ? ` in ${language}` : '';
			logger.info('Book already requested', { bookId: book.id, language, userId: locals.user.id });
			return new Response(`This book has already been requested${langMsg}`, { status: 409 });
		}

		// Create request
		try {
			await db.insert(requests).values({
				userId: locals.user.id,
				bookId: book.id,
				language: language || null,
				specialNotes: specialNotes || null,
				status: 'pending'
			});
			logger.info('Book request created successfully', {
				bookId: book.id,
				userId: locals.user.id,
				language
			});
		} catch (insertError: unknown) {
			const error = insertError as Error & { code?: string };
			logger.error('Failed to insert book request', error, {
				userId: locals.user.id,
				bookId: book.id,
				language: language || null,
				errorCode: error.code
			});
			throw error;
		}

		// Get author name for notification
		const bookWithAuthor = await db
			.select({
				authorName: sql<string>`GROUP_CONCAT(${authors.name}, ', ')`
			})
			.from(bookAuthors)
			.innerJoin(authors, eq(bookAuthors.authorId, authors.id))
			.where(eq(bookAuthors.bookId, book.id))
			.limit(1);

		const authorName = bookWithAuthor[0]?.authorName || undefined;

		// Send notification to admins
		await sendNotification(
			'request_created',
			formatRequestNotification({
				userName: locals.user.displayName,
				bookTitle: book.title,
				bookAuthor: authorName,
				language: language || undefined,
				specialNotes: specialNotes || undefined
			})
		);

		throw redirect(303, '/requests');
	} catch (error) {
		// Re-throw redirects (they're not errors)
		if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
			throw error;
		}
		logger.error('Error creating book request', error instanceof Error ? error : undefined, {
			userId: locals.user?.id
		});
		return new Response('Failed to create request', { status: 500 });
	}
};
