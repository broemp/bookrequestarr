import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Users table - stores user account information
 */
export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	username: text('username').notNull().unique(),
	displayName: text('display_name').notNull(),
	role: text('role', { enum: ['user', 'admin'] })
		.notNull()
		.default('user'),
	oidcSub: text('oidc_sub').unique(),
	preferredLanguage: text('preferred_language').default('English'),
	autoDownloadEnabled: integer('auto_download_enabled', { mode: 'boolean' })
		.notNull()
		.default(false),
	lastUsedLanguage: text('last_used_language'),
	lastUsedFormat: text('last_used_format', { enum: ['ebook', 'audiobook'] }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Authors table - stores unique authors from Hardcover API
 */
export const authors = sqliteTable('authors', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	hardcoverAuthorId: text('hardcover_author_id').notNull().unique(),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Books table - caches book metadata from Hardcover API
 */
export const books = sqliteTable('books', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	hardcoverId: text('hardcover_id').notNull().unique(),
	title: text('title').notNull(),
	description: text('description'),
	coverImage: text('cover_image'),
	isbn13: text('isbn_13'),
	isbn10: text('isbn_10'),
	publishDate: text('publish_date'),
	pages: integer('pages'),
	publisher: text('publisher'),
	rating: text('rating'), // Average rating as decimal string
	ratingCount: integer('rating_count'),
	cachedAt: integer('cached_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Book authors junction table - links books to authors (many-to-many)
 */
export const bookAuthors = sqliteTable('book_authors', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	bookId: text('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	authorId: text('author_id')
		.notNull()
		.references(() => authors.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Tags table - stores unique tags from Hardcover
 */
export const tags = sqliteTable('tags', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	hardcoverTagId: text('hardcover_tag_id').notNull().unique(),
	name: text('name').notNull(),
	category: text('category'), // e.g., "Genre", "Mood", "Pace", etc.
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Book tags junction table - links books to tags
 */
export const bookTags = sqliteTable('book_tags', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	bookId: text('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	tagId: text('tag_id')
		.notNull()
		.references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Requests table - stores book requests from users
 */
export const requests = sqliteTable('requests', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	bookId: text('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	status: text('status', {
		enum: ['pending', 'approved', 'rejected', 'completed', 'download_problem']
	})
		.notNull()
		.default('pending'),
	formatType: text('format_type', { enum: ['ebook', 'audiobook'] })
		.notNull()
		.default('ebook'),
	language: text('language'),
	specialNotes: text('special_notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Sessions table - stores user session tokens
 */
export const sessions = sqliteTable('sessions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Notifications table - stores notification history
 */
export const notifications = sqliteTable('notifications', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	type: text('type', { enum: ['request_created', 'request_updated', 'new_release'] }).notNull(),
	payload: text('payload').notNull(), // JSON stored as text
	sentAt: integer('sent_at', { mode: 'timestamp' }),
	status: text('status', { enum: ['pending', 'sent', 'failed'] })
		.notNull()
		.default('pending'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Settings table - stores application configuration
 */
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * New releases table - caches new book releases
 */
export const newReleases = sqliteTable('new_releases', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	bookId: text('book_id')
		.notNull()
		.references(() => books.id, { onDelete: 'cascade' }),
	releaseDate: text('release_date').notNull(),
	featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * API cache table - stores API request/response pairs with TTL
 */
/**
 * Downloads table - tracks book downloads from various sources
 * Supports: Anna's Archive (direct), Prowlarr/SABnzbd (Usenet)
 */
export const downloads = sqliteTable('downloads', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	requestId: text('request_id')
		.notNull()
		.references(() => requests.id, { onDelete: 'cascade' }),
	// Download source tracking
	downloadSource: text('download_source', { enum: ['prowlarr', 'annas_archive'] })
		.notNull()
		.default('annas_archive'),
	// Anna's Archive specific fields
	annasArchiveMd5: text('annas_archive_md5'), // Nullable - only for Anna's Archive downloads
	// Prowlarr/SABnzbd specific fields
	sabnzbdNzoId: text('sabnzbd_nzo_id'), // SABnzbd job ID for tracking
	nzbName: text('nzb_name'), // Original NZB release name
	indexerName: text('indexer_name'), // Which Prowlarr indexer was used
	// Match quality scoring
	confidenceScore: integer('confidence_score'), // 0-100, match quality from result matcher
	// Common fields
	searchMethod: text('search_method', { enum: ['isbn', 'title_author', 'manual'] }).notNull(),
	fileType: text('file_type').notNull(), // e.g., 'epub', 'pdf', 'mobi', 'nzb'
	filePath: text('file_path'),
	fileSize: integer('file_size'), // bytes
	downloadStatus: text('download_status', {
		enum: ['pending', 'downloading', 'completed', 'failed']
	})
		.notNull()
		.default('pending'),
	errorMessage: text('error_message'),
	downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/**
 * Download stats table - tracks daily download counts for rate limiting
 */
export const downloadStats = sqliteTable('download_stats', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	date: text('date').notNull().unique(), // YYYY-MM-DD format
	downloadCount: integer('download_count').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});
