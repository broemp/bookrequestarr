import { env } from '$env/dynamic/private';
import { db } from './db';
import { books } from './db/schema';
import { eq } from 'drizzle-orm';
import type { HardcoverBook, BookSearchResult } from '$lib/types/book';
import { getCachedResponse, setCachedResponse } from './cache';
import { logger } from './logger';

const HARDCOVER_API_URL = env.HARDCOVER_API_URL || 'https://api.hardcover.app/v1/graphql';

/**
 * Execute a GraphQL query against Hardcover API with caching
 */
async function graphqlQuery<T>(
	query: string,
	variables?: Record<string, unknown>,
	useCache = true
): Promise<T> {
	// Check cache first if enabled
	if (useCache) {
		const cached = await getCachedResponse<T>(query, variables);
		if (cached) {
			logger.info('API response served from cache', { variables });
			return cached;
		}
	}

	const apiKey = env.HARDCOVER_API_KEY;

	if (!apiKey) {
		throw new Error('HARDCOVER_API_KEY is not configured');
	}

	logger.info('Querying Hardcover API', { variables });

	const response = await fetch(HARDCOVER_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
		},
		body: JSON.stringify({ query, variables })
	});

	if (!response.ok) {
		throw new Error(`Hardcover API error: ${response.statusText}`);
	}

	const result = await response.json();

	if (result.errors) {
		throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
	}

	// Store in cache if enabled
	if (useCache) {
		await setCachedResponse(query, variables, result.data);
		logger.info('API response cached successfully', { variables });
	}

	return result.data;
}

/**
 * Search for books by title or author using Hardcover's search API
 */
export async function searchBooks(searchQuery: string, limit = 20): Promise<BookSearchResult[]> {
	const query = `
		query SearchBooks($query: String!) {
			search(query: $query) {
				ids
				results
			}
		}
	`;

	try {
		const data = await graphqlQuery<{ search: { ids: number[]; results: any } }>(query, {
			query: searchQuery
		});

		if (!data.search || !data.search.results) {
			logger.info('No search results found', { query: searchQuery });
			return [];
		}

		// Parse the results JSON
		const results =
			typeof data.search.results === 'string'
				? JSON.parse(data.search.results)
				: data.search.results;

		// Extract books from the search results
		const books: BookSearchResult[] = [];

		if (results.hits && Array.isArray(results.hits)) {
			for (const hit of results.hits) {
				if (hit.document) {
					const doc = hit.document;
					books.push({
						id: doc.id.toString(),
						hardcoverId: doc.id.toString(),
						title: doc.title,
						author: doc.author_names?.[0] || doc.contributions?.[0]?.author?.name,
						coverImage: doc.image?.url,
						publishDate: doc.release_date
					});
				}
			}
		}

		logger.info(`Search completed: ${books.length} books found`, { query: searchQuery, limit });
		return books.slice(0, limit);
	} catch (error) {
		logger.error('Error searching books', error, { query: searchQuery });
		return [];
	}
}

/**
 * Get detailed book information by Hardcover ID
 * Note: This function relies on the API response cache (7-day TTL) rather than
 * the book metadata cache, as the API response includes all fields (slug, subtitle, book_series)
 * that the UI needs. The book metadata cache is only used for storing basic info for requests.
 */
export async function getBookDetails(hardcoverId: string): Promise<HardcoverBook | null> {
	// Fetch from API (will use API response cache if available)
	const query = `
		query GetBook($id: Int!) {
			books(where: { id: { _eq: $id } }) {
				id
				slug
				title
				description
				subtitle
				image {
					url
				}
				release_date
				pages
				cached_contributors
				rating
				ratings_count
				contributions(where: { author_id: { _is_null: false } }) {
					author {
						id
						name
					}
				}
				default_physical_edition {
					isbn_13
					isbn_10
					publisher {
						name
					}
				}
				taggings(where: { tag: { tag_category: { category: { _eq: "Genre" } } } }) {
					tag_id
					tag {
						id
						slug
						tag
						tag_category {
							category
						}
					}
				}
				book_series {
					position
					series {
						id
						name
					}
				}
			}
		}
	`;

	try {
		const data = await graphqlQuery<{ books: HardcoverBook[] }>(query, {
			id: parseInt(hardcoverId)
		});

		if (!data.books || data.books.length === 0) {
			logger.info('Book not found', { hardcoverId });
			return null;
		}

		const book = data.books[0];

		// Cache book metadata including authors, ISBN, and genre tags
		await cacheBook(book);

		return book;
	} catch (error) {
		logger.error('Error fetching book details', error, { hardcoverId });
		return null;
	}
}

/**
 * Cache book metadata in local database with authors, ISBN, and genre tags
 */
export async function cacheBook(book: HardcoverBook): Promise<string> {
	const hardcoverId = String(book.id);

	// Extract data from default_physical_edition
	const isbn13 = book.default_physical_edition?.isbn_13 || null;
	const isbn10 = book.default_physical_edition?.isbn_10 || null;
	const publisher = book.default_physical_edition?.publisher?.name || null;

	// Extract rating data
	const rating = book.rating ? String(book.rating) : null;
	const ratingCount = book.ratings_count || null;

	logger.debug('Caching book', { hardcoverId, title: book.title, isbn13 });

	const [existingBook] = await db
		.select()
		.from(books)
		.where(eq(books.hardcoverId, hardcoverId))
		.limit(1);

	let bookId: string;

	if (existingBook) {
		// Update existing cache
		await db
			.update(books)
			.set({
				title: book.title,
				description: book.description,
				coverImage: book.image?.url || null,
				isbn13,
				isbn10,
				publishDate: book.release_date || null,
				pages: book.pages || null,
				publisher,
				rating,
				ratingCount,
				cachedAt: new Date()
			})
			.where(eq(books.id, existingBook.id));

		bookId = existingBook.id;
		logger.info('Book cache updated', { hardcoverId, dbId: bookId });
	} else {
		// Insert new cache entry
		const [newBook] = await db
			.insert(books)
			.values({
				hardcoverId,
				title: book.title,
				description: book.description || null,
				coverImage: book.image?.url || null,
				isbn13,
				isbn10,
				publishDate: book.release_date || null,
				pages: book.pages || null,
				publisher,
				rating,
				ratingCount
			})
			.returning();

		bookId = newBook.id;
		logger.info('Book cached for first time', { hardcoverId, dbId: bookId });
	}

	// Cache authors
	await cacheBookAuthors(bookId, book.contributions);

	// Cache tags
	await cacheBookTags(bookId, book.taggings);

	return bookId;
}

/**
 * Cache authors for a book
 */
async function cacheBookAuthors(bookId: string, contributions: any[] | undefined) {
	if (!contributions || contributions.length === 0) {
		return;
	}

	const { authors: authorsTable, bookAuthors: bookAuthorsTable } = await import('./db/schema');

	// First, remove existing book-author links
	await db.delete(bookAuthorsTable).where(eq(bookAuthorsTable.bookId, bookId));

	for (const contribution of contributions) {
		if (!contribution.author) continue;

		const hardcoverAuthorId = String(contribution.author.id);
		const authorName = contribution.author.name;

		// Check if author exists
		const [existingAuthor] = await db
			.select()
			.from(authorsTable)
			.where(eq(authorsTable.hardcoverAuthorId, hardcoverAuthorId))
			.limit(1);

		let authorId: string;

		if (existingAuthor) {
			authorId = existingAuthor.id;
		} else {
			// Create new author
			const [newAuthor] = await db
				.insert(authorsTable)
				.values({
					hardcoverAuthorId,
					name: authorName
				})
				.returning();
			authorId = newAuthor.id;
		}

		// Link book to author
		await db.insert(bookAuthorsTable).values({
			bookId,
			authorId
		});
	}

	logger.debug('Book authors cached', { bookId, authorCount: contributions.length });
}

/**
 * Cache tags for a book
 */
async function cacheBookTags(bookId: string, taggings: any[] | undefined) {
	if (!taggings || taggings.length === 0) {
		return;
	}

	const { tags: tagsTable, bookTags: bookTagsTable } = await import('./db/schema');

	// First, remove existing book tags
	await db.delete(bookTagsTable).where(eq(bookTagsTable.bookId, bookId));

	for (const tagging of taggings) {
		if (!tagging.tag) continue;

		const hardcoverTagId = String(tagging.tag.id);
		const tagName = tagging.tag.tag; // The tag name is in the 'tag' field
		const tagCategory = tagging.tag.tag_category?.category || null;

		// Check if tag exists
		const [existingTag] = await db
			.select()
			.from(tagsTable)
			.where(eq(tagsTable.hardcoverTagId, hardcoverTagId))
			.limit(1);

		let tagId: string;

		if (existingTag) {
			tagId = existingTag.id;
		} else {
			// Create new tag
			const [newTag] = await db
				.insert(tagsTable)
				.values({
					hardcoverTagId,
					name: tagName,
					category: tagCategory
				})
				.returning();
			tagId = newTag.id;
		}

		// Link book to tag
		await db.insert(bookTagsTable).values({
			bookId,
			tagId
		});
	}

	logger.debug('Book tags cached', { bookId, tagCount: taggings.length });
}

/**
 * Get books in a series by series ID
 * Uses a combination approach: get all series entries, map to their default physical editions,
 * then deduplicate by book ID keeping the entry with the most specific position
 */
export async function getBooksBySeries(seriesId: string): Promise<BookSearchResult[]> {
	const query = `
		query GetBooksBySeries($seriesId: Int!) {
			book_series(
				where: { 
					series_id: { _eq: $seriesId }
				}
				order_by: { position: asc }
			) {
				position
				book {
					id
					default_physical_edition {
						book_id
						book {
							id
							title
							image {
								url
							}
							release_date
							contributions(where: { author_id: { _is_null: false } }) {
								author {
									id
									name
								}
							}
						}
					}
				}
			}
		}
	`;

	try {
		const data = await graphqlQuery<{
			book_series: Array<{
				position?: number;
				book: {
					id: string;
					default_physical_edition?: {
						book_id?: string;
						book?: HardcoverBook;
					};
				};
			}>;
		}>(query, { seriesId: parseInt(seriesId) });

		if (!data.book_series || data.book_series.length === 0) {
			logger.info('No books found in series', { seriesId });
			return [];
		}

		// Deduplicate by default_physical_edition book ID
		// Multiple editions at the same position will all point to the same default physical edition
		// We keep the first occurrence (which has the lowest position due to order_by)
		const seenBookIds = new Set<string>();
		const uniqueBooks: BookSearchResult[] = [];

		for (const bs of data.book_series) {
			const defaultEdition = bs.book.default_physical_edition?.book;

			if (!defaultEdition) {
				logger.debug('Skipping book_series entry without default_physical_edition', {
					originalBookId: bs.book.id,
					position: bs.position
				});
				continue;
			}

			// Skip if we've already added this default physical edition
			if (seenBookIds.has(defaultEdition.id)) {
				logger.debug('Skipping duplicate default_physical_edition', {
					bookId: defaultEdition.id,
					title: defaultEdition.title,
					position: bs.position
				});
				continue;
			}

			seenBookIds.add(defaultEdition.id);
			uniqueBooks.push({
				id: defaultEdition.id,
				hardcoverId: defaultEdition.id,
				title: defaultEdition.title,
				author: defaultEdition.contributions?.[0]?.author?.name,
				coverImage: defaultEdition.image?.url,
				publishDate: defaultEdition.release_date,
				position: bs.position
			});
		}

		logger.info(
			`Series query completed: ${uniqueBooks.length} unique books found from ${data.book_series.length} total entries`,
			{ seriesId }
		);
		return uniqueBooks;
	} catch (error) {
		logger.error('Error fetching books by series', error, { seriesId });
		return [];
	}
}

/**
 * Get trending books from Hardcover API
 */
export async function getTrendingBooks(limit = 20): Promise<BookSearchResult[]> {
	const trendingQuery = `
		query GetTrendingBookIds($from: date!, $to: date!, $limit: Int!, $offset: Int!) {
			books_trending(from: $from, to: $to, limit: $limit, offset: $offset) {
				ids
			}
		}
	`;

	const booksQuery = `
		query GetBooksByIds($ids: [Int!]!) {
			books(where: { id: { _in: $ids } }) {
				id
				title
				image {
					url
				}
				release_date
				contributions(where: { author_id: { _is_null: false } }) {
					author {
						id
						name
					}
				}
			}
		}
	`;

	try {
		// Get trending books from the last 30 days
		const today = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
		const toDate = today.toISOString().split('T')[0];

		// First, get the trending book IDs
		const trendingData = await graphqlQuery<{ books_trending: { ids: number[] } }>(trendingQuery, {
			from: fromDate,
			to: toDate,
			limit,
			offset: 0
		});

		const bookIds = trendingData.books_trending.ids;

		if (!bookIds || bookIds.length === 0) {
			logger.info('No trending books found');
			return [];
		}

		// Then, fetch the full book details
		const booksData = await graphqlQuery<{ books: HardcoverBook[] }>(booksQuery, {
			ids: bookIds
		});

		const books = booksData.books.map((book) => ({
			id: book.id,
			hardcoverId: book.id,
			title: book.title,
			author: book.contributions?.[0]?.author?.name,
			coverImage: book.image?.url,
			publishDate: book.release_date
		}));

		logger.info(`Trending books query completed: ${books.length} books found`);
		return books;
	} catch (error) {
		logger.error('Error fetching trending books', error);
		return [];
	}
}

/**
 * Get new releases from Hardcover API
 */
export async function getNewReleases(limit = 20): Promise<BookSearchResult[]> {
	// Calculate date 6 months ago for filtering new releases
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
	const minReleaseDate = sixMonthsAgo.toISOString().split('T')[0];

	const query = `
		query GetNewReleases($limit: Int!, $minDate: date!) {
			books(
				where: { release_date: { _gte: $minDate } }
				order_by: { release_date: desc }
				limit: $limit
			) {
				id
				title
				image {
					url
				}
				release_date
				contributions(where: { author_id: { _is_null: false } }) {
					author {
						id
						name
					}
				}
			}
		}
	`;

	try {
		const data = await graphqlQuery<{ books: HardcoverBook[] }>(query, {
			limit,
			minDate: minReleaseDate
		});

		const books = data.books.map((book) => ({
			id: book.id,
			hardcoverId: book.id,
			title: book.title,
			author: book.contributions?.[0]?.author?.name,
			coverImage: book.image?.url,
			publishDate: book.release_date
		}));

		logger.info(`New releases query completed: ${books.length} books found`);
		return books;
	} catch (error) {
		logger.error('Error fetching new releases', error);
		return [];
	}
}
