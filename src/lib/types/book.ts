import type { books } from '$lib/server/db/schema';

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export interface HardcoverBook {
	id: string;
	slug?: string;
	title: string;
	subtitle?: string;
	description?: string;
	image?: {
		url?: string;
	};
	release_date?: string;
	pages?: number;
	rating?: number;
	ratings_count?: number;
	cached_contributors?: any;
	default_physical_edition?: {
		isbn_13?: string;
		isbn_10?: string;
		language?: string;
		publisher?: {
			name?: string;
		};
	};
	default_ebook_edition?: {
		isbn_13?: string;
		isbn_10?: string;
		language?: string;
		publisher?: {
			name?: string;
		};
	};
	taggings?: Array<{
		tag_id?: string;
		tag: {
			id: string;
			slug?: string;
			tag: string; // The actual tag name is in the 'tag' field
			tag_category?: {
				category?: string;
			};
		};
	}>;
	contributions?: Array<{
		author: {
			id: string;
			name: string;
		};
	}>;
	genres?: Array<{
		id: string;
		name: string;
	}>;
	book_series?: Array<{
		position?: number;
		series: {
			id: string;
			name: string;
		};
	}>;
}

export interface BookSearchResult {
	id: string;
	hardcoverId: string;
	title: string;
	author?: string;
	coverImage?: string;
	publishDate?: string;
	description?: string;
	position?: number;
}
