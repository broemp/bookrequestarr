import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requests, books, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendNotification, formatRequestNotification } from '$lib/server/notifications';

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

		console.log('Creating request with bookId:', bookId, 'hardcoverId:', hardcoverId);

		if (!bookId && !hardcoverId) {
			return new Response('Book ID or Hardcover ID is required', { status: 400 });
		}

		// Try to get book by database ID first, then by Hardcover ID
		let book;
		if (bookId) {
			[book] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
		}
		
		if (!book && hardcoverId) {
			console.log('Book not found by dbId, trying hardcoverId:', hardcoverId);
			[book] = await db.select().from(books).where(eq(books.hardcoverId, hardcoverId)).limit(1);
		}

		if (!book) {
			console.error('Book not found in database with ID:', bookId, 'or hardcoverId:', hardcoverId);
			return new Response('Book not found', { status: 404 });
		}

		console.log('Found book:', { id: book.id, hardcoverId: book.hardcoverId, title: book.title });
		console.log('Creating request for userId:', locals.user.id, 'bookId:', book.id);

		// Verify the user exists
		const [userExists] = await db.select({ id: users.id }).from(users).where(eq(users.id, locals.user.id)).limit(1);
		if (!userExists) {
			console.error('User not found in database:', locals.user.id);
			return new Response('User not found', { status: 404 });
		}

		// Verify the book exists
		const [bookExists] = await db.select({ id: books.id }).from(books).where(eq(books.id, book.id)).limit(1);
		if (!bookExists) {
			console.error('Book ID does not exist in books table:', book.id);
			return new Response('Book ID invalid', { status: 404 });
		}

		console.log('Both user and book verified, creating request...');

		// Check if user already has a request for this book in the same language
		const { and } = await import('drizzle-orm');
		const existingRequests = await db
			.select()
			.from(requests)
			.where(eq(requests.bookId, book.id));

		// Check if there's a request with the same language (or both null)
		const duplicateRequest = existingRequests.find(req => {
			const reqLang = req.language?.toLowerCase().trim() || null;
			const newLang = language?.toLowerCase().trim() || null;
			return reqLang === newLang;
		});

		if (duplicateRequest) {
			const langMsg = language ? ` in ${language}` : '';
			console.log(`Book already requested${langMsg}`);
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
			console.log('Request created successfully!');
		} catch (insertError: any) {
			console.error('Failed to insert request:', insertError);
			console.error('Error code:', insertError.code);
			console.error('Error message:', insertError.message);
			console.error('Attempted to insert:', {
				userId: locals.user.id,
				bookId: book.id,
				language: language || null,
				specialNotes: specialNotes || null,
				status: 'pending'
			});
			throw insertError;
		}

		// Send notification to admins
		await sendNotification(
			'request_created',
			formatRequestNotification({
				userName: locals.user.displayName,
				bookTitle: book.title,
				bookAuthor: book.author || undefined,
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
		console.error('Error creating request:', error);
		return new Response('Failed to create request', { status: 500 });
	}
};
