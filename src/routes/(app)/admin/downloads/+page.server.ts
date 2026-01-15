import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	downloads,
	requests,
	books,
	users,
	downloadStats,
	bookAuthors,
	authors
} from '$lib/server/db/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { isCalibreEnabled, getCalibreBaseUrl } from '$lib/server/calibre';

export const load: PageServerLoad = async () => {
	// Get overall statistics
	const [totalDownloads] = await db.select({ count: sql<number>`count(*)` }).from(downloads);

	const [completedDownloads] = await db
		.select({ count: sql<number>`count(*)` })
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'completed'));

	const [failedDownloads] = await db
		.select({ count: sql<number>`count(*)` })
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'failed'));

	const [pendingDownloads] = await db
		.select({ count: sql<number>`count(*)` })
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'pending'));

	const [downloadingDownloads] = await db
		.select({ count: sql<number>`count(*)` })
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'downloading'));

	// Calculate total file size of completed downloads
	const [totalSizeResult] = await db
		.select({ totalSize: sql<number>`COALESCE(SUM(${downloads.fileSize}), 0)` })
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'completed'));

	// Get download stats for the last 30 days
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

	const dailyStats = await db
		.select()
		.from(downloadStats)
		.where(gte(downloadStats.date, thirtyDaysAgoStr))
		.orderBy(desc(downloadStats.date))
		.limit(30);

	// Get recent downloads with full details
	const recentDownloads = await db
		.select({
			id: downloads.id,
			requestId: downloads.requestId,
			annasArchiveMd5: downloads.annasArchiveMd5,
			searchMethod: downloads.searchMethod,
			fileType: downloads.fileType,
			filePath: downloads.filePath,
			fileSize: downloads.fileSize,
			downloadStatus: downloads.downloadStatus,
			errorMessage: downloads.errorMessage,
			downloadedAt: downloads.downloadedAt,
			createdAt: downloads.createdAt,
			// Request details
			requestStatus: requests.status,
			requestLanguage: requests.language,
			// Book details
			bookId: books.id,
			bookTitle: books.title,
			bookCoverImage: books.coverImage,
			// User details
			userId: users.id,
			userDisplayName: users.displayName,
			userEmail: users.email
		})
		.from(downloads)
		.innerJoin(requests, eq(downloads.requestId, requests.id))
		.innerJoin(books, eq(requests.bookId, books.id))
		.innerJoin(users, eq(requests.userId, users.id))
		.orderBy(desc(downloads.createdAt))
		.limit(50);

	// Get authors for each book
	const bookIds = [...new Set(recentDownloads.map((d) => d.bookId))];
	const bookAuthorsData = await db
		.select({
			bookId: bookAuthors.bookId,
			authorName: authors.name
		})
		.from(bookAuthors)
		.innerJoin(authors, eq(bookAuthors.authorId, authors.id))
		.where(
			sql`${bookAuthors.bookId} IN (${sql.join(
				bookIds.map((id) => sql`${id}`),
				sql`, `
			)})`
		);

	// Group authors by book
	const authorsByBook = bookAuthorsData.reduce(
		(acc, { bookId, authorName }) => {
			if (!acc[bookId]) acc[bookId] = [];
			acc[bookId].push(authorName);
			return acc;
		},
		{} as Record<string, string[]>
	);

	// Enhance downloads with author information
	const downloadsWithAuthors = recentDownloads.map((download) => ({
		...download,
		bookAuthors: authorsByBook[download.bookId] || []
	}));

	// Get downloads by file type
	const downloadsByFileType = await db
		.select({
			fileType: downloads.fileType,
			count: sql<number>`count(*)`
		})
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'completed'))
		.groupBy(downloads.fileType)
		.orderBy(desc(sql<number>`count(*)`));

	// Get downloads by search method
	const downloadsBySearchMethod = await db
		.select({
			searchMethod: downloads.searchMethod,
			count: sql<number>`count(*)`
		})
		.from(downloads)
		.where(eq(downloads.downloadStatus, 'completed'))
		.groupBy(downloads.searchMethod)
		.orderBy(desc(sql<number>`count(*)`));

	// Get top users by download count
	const topUsers = await db
		.select({
			userId: users.id,
			userDisplayName: users.displayName,
			userEmail: users.email,
			downloadCount: sql<number>`count(*)`
		})
		.from(downloads)
		.innerJoin(requests, eq(downloads.requestId, requests.id))
		.innerJoin(users, eq(requests.userId, users.id))
		.where(eq(downloads.downloadStatus, 'completed'))
		.groupBy(users.id, users.displayName, users.email)
		.orderBy(desc(sql<number>`count(*)`))
		.limit(10);

	return {
		stats: {
			total: totalDownloads.count,
			completed: completedDownloads.count,
			failed: failedDownloads.count,
			pending: pendingDownloads.count,
			downloading: downloadingDownloads.count,
			totalSize: totalSizeResult.totalSize
		},
		dailyStats,
		recentDownloads: downloadsWithAuthors,
		downloadsByFileType,
		downloadsBySearchMethod,
		topUsers,
		calibreEnabled: await isCalibreEnabled(),
		calibreBaseUrl: await getCalibreBaseUrl()
	};
};
