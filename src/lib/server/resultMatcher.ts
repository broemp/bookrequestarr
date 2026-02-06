import { logger } from './logger';
import type { Book } from '$lib/types/book';

/**
 * Confidence levels for match quality
 */
export enum ConfidenceLevel {
	HIGH = 'high', // 80-100: Auto-download enabled
	MEDIUM = 'medium', // 50-79: Download with warning, log for review
	LOW = 'low' // 0-49: Skip result, try fallback
}

/**
 * Result of confidence scoring
 */
export interface MatchResult {
	score: number; // 0-100
	level: ConfidenceLevel;
	breakdown: {
		isbn: number;
		title: number;
		author: number;
		year: number;
		language: number;
	};
	warnings: string[];
}

/**
 * Search result to match against
 */
export interface SearchResultCandidate {
	title: string;
	author?: string;
	isbn?: string;
	year?: string;
	language?: string;
}

/**
 * Book request information for matching
 */
export interface BookMatchRequest {
	title: string;
	author: string;
	isbn13?: string | null;
	isbn10?: string | null;
	publishYear?: string | null;
	preferredLanguage?: string | null;
}

/**
 * Scoring weights (total = 100)
 */
const WEIGHTS = {
	ISBN: 50,
	TITLE: 25,
	AUTHOR: 15,
	YEAR: 5,
	LANGUAGE: 5
} as const;

/**
 * Confidence thresholds
 */
const THRESHOLDS = {
	HIGH: 80,
	MEDIUM: 50
} as const;

/**
 * Calculate confidence score for a search result matching a book request
 */
export function calculateConfidence(
	candidate: SearchResultCandidate,
	request: BookMatchRequest
): MatchResult {
	const breakdown = {
		isbn: 0,
		title: 0,
		author: 0,
		year: 0,
		language: 0
	};
	const warnings: string[] = [];

	// ISBN Match (highest priority - 50 points)
	if (candidate.isbn && (request.isbn13 || request.isbn10)) {
		const normalizedCandidateIsbn = normalizeIsbn(candidate.isbn);
		const normalizedIsbn13 = request.isbn13 ? normalizeIsbn(request.isbn13) : null;
		const normalizedIsbn10 = request.isbn10 ? normalizeIsbn(request.isbn10) : null;

		if (
			(normalizedIsbn13 && normalizedCandidateIsbn === normalizedIsbn13) ||
			(normalizedIsbn10 && normalizedCandidateIsbn === normalizedIsbn10)
		) {
			breakdown.isbn = WEIGHTS.ISBN;
		} else if (normalizedCandidateIsbn) {
			// Partial ISBN match (e.g., ISBN-10 vs ISBN-13 conversion)
			const isbnMatch = checkIsbnConversion(
				normalizedCandidateIsbn,
				normalizedIsbn13,
				normalizedIsbn10
			);
			if (isbnMatch) {
				breakdown.isbn = WEIGHTS.ISBN;
			} else {
				warnings.push('ISBN mismatch');
			}
		}
	}

	// Title Similarity (25 points)
	if (candidate.title && request.title) {
		const normalizedCandidateTitle = normalizeTitle(candidate.title);
		const normalizedRequestTitle = normalizeTitle(request.title);
		const titleSimilarity = jaroWinklerSimilarity(normalizedCandidateTitle, normalizedRequestTitle);
		breakdown.title = Math.round(titleSimilarity * WEIGHTS.TITLE);

		if (titleSimilarity < 0.7) {
			warnings.push(`Title similarity low: ${Math.round(titleSimilarity * 100)}%`);
		}
	}

	// Author Match (15 points)
	if (candidate.author && request.author) {
		const authorSimilarity = calculateAuthorSimilarity(candidate.author, request.author);
		breakdown.author = Math.round(authorSimilarity * WEIGHTS.AUTHOR);

		if (authorSimilarity < 0.7) {
			warnings.push(`Author similarity low: ${Math.round(authorSimilarity * 100)}%`);
		}
	}

	// Year Match (5 points)
	if (candidate.year && request.publishYear) {
		const candidateYear = extractYear(candidate.year);
		const requestYear = extractYear(request.publishYear);

		if (candidateYear && requestYear) {
			const yearDiff = Math.abs(candidateYear - requestYear);
			if (yearDiff === 0) {
				breakdown.year = WEIGHTS.YEAR;
			} else if (yearDiff === 1) {
				breakdown.year = Math.round(WEIGHTS.YEAR * 0.8); // 80% for ±1 year
			} else if (yearDiff === 2) {
				breakdown.year = Math.round(WEIGHTS.YEAR * 0.5); // 50% for ±2 years
			} else {
				warnings.push(`Publication year mismatch: ${candidateYear} vs ${requestYear}`);
			}
		}
	}

	// Language Match (5 points)
	if (candidate.language && request.preferredLanguage) {
		if (normalizeLanguage(candidate.language) === normalizeLanguage(request.preferredLanguage)) {
			breakdown.language = WEIGHTS.LANGUAGE;
		} else {
			warnings.push(`Language mismatch: ${candidate.language} vs ${request.preferredLanguage}`);
		}
	} else if (!candidate.language && request.preferredLanguage) {
		// Unknown language - give partial credit
		breakdown.language = Math.round(WEIGHTS.LANGUAGE * 0.5);
	}

	const score =
		breakdown.isbn + breakdown.title + breakdown.author + breakdown.year + breakdown.language;

	const level =
		score >= THRESHOLDS.HIGH
			? ConfidenceLevel.HIGH
			: score >= THRESHOLDS.MEDIUM
				? ConfidenceLevel.MEDIUM
				: ConfidenceLevel.LOW;

	logger.debug('Confidence score calculated', {
		candidateTitle: candidate.title,
		requestTitle: request.title,
		score,
		level,
		breakdown
	});

	return { score, level, breakdown, warnings };
}

/**
 * Normalize ISBN by removing hyphens and spaces
 */
function normalizeIsbn(isbn: string): string {
	return isbn.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Check if ISBNs match considering ISBN-10 to ISBN-13 conversion
 */
function checkIsbnConversion(
	candidate: string,
	isbn13: string | null,
	isbn10: string | null
): boolean {
	// ISBN-13 to ISBN-10: Remove 978 prefix and recalculate check digit
	// ISBN-10 to ISBN-13: Add 978 prefix and recalculate check digit
	if (candidate.length === 13 && isbn10 && isbn10.length === 10) {
		// Check if candidate ISBN-13 converts to the ISBN-10
		if (candidate.startsWith('978')) {
			const candidateCore = candidate.slice(3, 12);
			const isbn10Core = isbn10.slice(0, 9);
			if (candidateCore === isbn10Core) {
				return true;
			}
		}
	}

	if (candidate.length === 10 && isbn13 && isbn13.length === 13) {
		// Check if ISBN-13 converts to candidate ISBN-10
		if (isbn13.startsWith('978')) {
			const isbn13Core = isbn13.slice(3, 12);
			const candidateCore = candidate.slice(0, 9);
			if (isbn13Core === candidateCore) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Normalize title for comparison
 * - Removes subtitles (after colon or dash)
 * - Removes edition info (e.g., "2nd Edition", "Revised")
 * - Removes punctuation
 * - Converts to lowercase
 * - Removes articles at start
 */
export function normalizeTitle(title: string): string {
	let normalized = title.toLowerCase();

	// Remove content after colon or long dash (subtitles)
	normalized = normalized.split(/[:–—]/)[0];

	// Remove edition info
	normalized = normalized.replace(
		/\b((\d+)(st|nd|rd|th)\s+edition|revised|updated|expanded|complete|unabridged|abridged|anniversary|special|collector'?s?|deluxe|illustrated)\b/gi,
		''
	);

	// Remove parenthetical content
	normalized = normalized.replace(/\([^)]*\)/g, '');
	normalized = normalized.replace(/\[[^\]]*\]/g, '');

	// Remove file format indicators often found in release names
	normalized = normalized.replace(/\b(epub|pdf|mobi|azw3|djvu|txt|rtf|doc|docx)\b/gi, '');

	// Remove punctuation
	normalized = normalized.replace(/[^\w\s]/g, ' ');

	// Remove leading articles
	normalized = normalized.replace(/^(the|a|an)\s+/i, '');

	// Collapse whitespace
	normalized = normalized.replace(/\s+/g, ' ').trim();

	return normalized;
}

/**
 * Calculate author similarity handling various name formats
 */
function calculateAuthorSimilarity(candidateAuthor: string, requestAuthor: string): number {
	const normalizedCandidate = normalizeAuthorName(candidateAuthor);
	const normalizedRequest = normalizeAuthorName(requestAuthor);

	// Try direct comparison first
	const directSimilarity = jaroWinklerSimilarity(normalizedCandidate, normalizedRequest);

	// Also try comparing individual authors (for multiple author books)
	const candidateAuthors = splitAuthors(candidateAuthor);
	const requestAuthors = splitAuthors(requestAuthor);

	let maxSimilarity = directSimilarity;

	// Check if any candidate author matches any request author
	for (const ca of candidateAuthors) {
		for (const ra of requestAuthors) {
			const similarity = jaroWinklerSimilarity(normalizeAuthorName(ca), normalizeAuthorName(ra));
			if (similarity > maxSimilarity) {
				maxSimilarity = similarity;
			}

			// Also check reversed name format
			const reversedSimilarity = jaroWinklerSimilarity(
				normalizeAuthorName(ca),
				normalizeAuthorName(reverseName(ra))
			);
			if (reversedSimilarity > maxSimilarity) {
				maxSimilarity = reversedSimilarity;
			}
		}
	}

	return maxSimilarity;
}

/**
 * Normalize author name for comparison
 */
export function normalizeAuthorName(name: string): string {
	let normalized = name.toLowerCase();

	// Remove common prefixes/suffixes
	normalized = normalized.replace(
		/\b(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|jr\.?|sr\.?|iii?|iv|phd|md|esq\.?)\b/gi,
		''
	);

	// Handle "Last, First" format - convert to "First Last"
	if (normalized.includes(',')) {
		const parts = normalized.split(',').map((p) => p.trim());
		if (parts.length === 2) {
			normalized = `${parts[1]} ${parts[0]}`;
		}
	}

	// Remove punctuation except spaces
	normalized = normalized.replace(/[^\w\s]/g, ' ');

	// Collapse whitespace
	normalized = normalized.replace(/\s+/g, ' ').trim();

	return normalized;
}

/**
 * Reverse name format (First Last -> Last First)
 */
function reverseName(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		const lastName = parts.pop()!;
		return `${lastName} ${parts.join(' ')}`;
	}
	return name;
}

/**
 * Split multiple authors from a string
 */
function splitAuthors(authors: string): string[] {
	// Common separators: ", ", " & ", " and ", "; "
	return authors
		.split(/[,;&]|\band\b/i)
		.map((a) => a.trim())
		.filter((a) => a.length > 0);
}

/**
 * Extract year from a date string or year string
 */
export function extractYear(dateStr: string): number | null {
	// Try to find a 4-digit year
	const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
	if (yearMatch) {
		return parseInt(yearMatch[0], 10);
	}
	return null;
}

/**
 * Normalize language name for comparison
 */
export function normalizeLanguage(lang: string): string {
	const normalized = lang.toLowerCase().trim();

	// Map common variations
	const languageMap: Record<string, string> = {
		en: 'english',
		eng: 'english',
		english: 'english',
		'en-us': 'english',
		'en-gb': 'english',
		de: 'german',
		deu: 'german',
		ger: 'german',
		german: 'german',
		deutsch: 'german',
		fr: 'french',
		fra: 'french',
		fre: 'french',
		french: 'french',
		français: 'french',
		es: 'spanish',
		spa: 'spanish',
		spanish: 'spanish',
		español: 'spanish',
		it: 'italian',
		ita: 'italian',
		italian: 'italian',
		italiano: 'italian',
		pt: 'portuguese',
		por: 'portuguese',
		portuguese: 'portuguese',
		português: 'portuguese',
		ru: 'russian',
		rus: 'russian',
		russian: 'russian',
		русский: 'russian',
		zh: 'chinese',
		chi: 'chinese',
		chinese: 'chinese',
		中文: 'chinese',
		ja: 'japanese',
		jpn: 'japanese',
		japanese: 'japanese',
		日本語: 'japanese',
		ko: 'korean',
		kor: 'korean',
		korean: 'korean',
		한국어: 'korean',
		nl: 'dutch',
		nld: 'dutch',
		dut: 'dutch',
		dutch: 'dutch',
		pl: 'polish',
		pol: 'polish',
		polish: 'polish'
	};

	return languageMap[normalized] || normalized;
}

/**
 * Parse release name to extract metadata
 * Handles common patterns in torrent/NZB release names
 */
export function parseReleaseName(releaseName: string): {
	title: string;
	author?: string;
	year?: string;
	language?: string;
	format?: string;
} {
	let title = releaseName;
	let author: string | undefined;
	let year: string | undefined;
	let language: string | undefined;
	let format: string | undefined;

	// Extract format
	const formatMatch = title.match(/\b(epub|pdf|mobi|azw3|djvu|cbr|cbz)\b/i);
	if (formatMatch) {
		format = formatMatch[1].toLowerCase();
		title = title.replace(formatMatch[0], '');
	}

	// Extract year
	const yearMatch = title.match(/\b(19|20)\d{2}\b/);
	if (yearMatch) {
		year = yearMatch[0];
	}

	// Common patterns: "Author - Title" or "Title - Author" or "Title (Author)"
	// Also: "Title.Author.Year.Format" (dot-separated)

	// Handle parenthetical author
	const parenAuthorMatch = title.match(/\(([^)]+)\)\s*$/);
	if (parenAuthorMatch) {
		author = parenAuthorMatch[1];
		title = title.replace(parenAuthorMatch[0], '');
	}

	// Handle "Author - Title" or "Title - Author"
	const dashParts = title.split(/\s+-\s+/);
	if (dashParts.length === 2) {
		// Heuristic: authors usually don't have articles, titles do
		const [part1, part2] = dashParts;
		if (/^(the|a|an)\s/i.test(part2) || part1.split(/\s+/).length <= 3) {
			author = part1;
			title = part2;
		} else {
			title = part1;
			author = part2;
		}
	}

	// Handle dot-separated format (common in release groups)
	if (!author && title.includes('.')) {
		const dotParts = title.split('.');
		if (dotParts.length >= 2) {
			// Remove common release group tags
			const cleanParts = dotParts.filter(
				(p) => !/^(epub|pdf|mobi|retail|proper|repack|scan|\d{4})$/i.test(p)
			);

			if (cleanParts.length >= 2) {
				author = cleanParts[0].replace(/_/g, ' ');
				title = cleanParts.slice(1).join(' ').replace(/_/g, ' ');
			}
		}
	}

	// Extract language if present
	const langMatch = title.match(
		/\b(english|german|french|spanish|italian|portuguese|russian|chinese|japanese|korean|dutch|polish)\b/i
	);
	if (langMatch) {
		language = langMatch[1];
		title = title.replace(langMatch[0], '');
	}

	// Clean up
	title = title.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
	if (author) {
		author = author.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
	}

	return { title, author, year, language, format };
}

/**
 * Jaro-Winkler similarity algorithm
 * Returns a value between 0 and 1 (1 = identical)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
	if (s1 === s2) return 1;
	if (s1.length === 0 || s2.length === 0) return 0;

	const jaro = jaroSimilarity(s1, s2);

	// Winkler modification - boost for common prefix
	const prefixLength = Math.min(4, commonPrefixLength(s1, s2));
	const winklerBoost = 0.1;

	return jaro + prefixLength * winklerBoost * (1 - jaro);
}

/**
 * Jaro similarity algorithm
 */
function jaroSimilarity(s1: string, s2: string): number {
	if (s1 === s2) return 1;

	const len1 = s1.length;
	const len2 = s2.length;

	// Matching window
	const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

	const s1Matches = new Array(len1).fill(false);
	const s2Matches = new Array(len2).fill(false);

	let matches = 0;
	let transpositions = 0;

	// Find matches
	for (let i = 0; i < len1; i++) {
		const start = Math.max(0, i - matchDistance);
		const end = Math.min(i + matchDistance + 1, len2);

		for (let j = start; j < end; j++) {
			if (s2Matches[j] || s1[i] !== s2[j]) continue;
			s1Matches[i] = true;
			s2Matches[j] = true;
			matches++;
			break;
		}
	}

	if (matches === 0) return 0;

	// Count transpositions
	let k = 0;
	for (let i = 0; i < len1; i++) {
		if (!s1Matches[i]) continue;
		while (!s2Matches[k]) k++;
		if (s1[i] !== s2[k]) transpositions++;
		k++;
	}

	return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Find length of common prefix (max 4 for Winkler)
 */
function commonPrefixLength(s1: string, s2: string): number {
	let i = 0;
	const maxLen = Math.min(s1.length, s2.length, 4);
	while (i < maxLen && s1[i] === s2[i]) {
		i++;
	}
	return i;
}

/**
 * Select best match from candidates above a minimum score threshold
 */
export function selectBestMatch(
	candidates: SearchResultCandidate[],
	request: BookMatchRequest,
	minScore: number = THRESHOLDS.MEDIUM
): {
	candidate: SearchResultCandidate;
	result: MatchResult;
} | null {
	if (candidates.length === 0) return null;

	let bestMatch: { candidate: SearchResultCandidate; result: MatchResult } | null = null;

	for (const candidate of candidates) {
		const result = calculateConfidence(candidate, request);

		if (result.score >= minScore) {
			if (!bestMatch || result.score > bestMatch.result.score) {
				bestMatch = { candidate, result };
			}
		}
	}

	if (bestMatch) {
		logger.info('Best match selected', {
			candidateTitle: bestMatch.candidate.title,
			score: bestMatch.result.score,
			level: bestMatch.result.level
		});
	} else {
		logger.info('No match above minimum threshold', {
			requestTitle: request.title,
			minScore,
			candidatesCount: candidates.length
		});
	}

	return bestMatch;
}

/**
 * Create BookMatchRequest from a Book entity
 */
export function bookToMatchRequest(
	book: Book,
	authorName: string,
	preferredLanguage?: string | null
): BookMatchRequest {
	return {
		title: book.title,
		author: authorName,
		isbn13: book.isbn13,
		isbn10: book.isbn10,
		publishYear: book.publishDate ? extractYear(book.publishDate)?.toString() : null,
		preferredLanguage
	};
}

/**
 * Get confidence level description
 */
export function getConfidenceLevelDescription(level: ConfidenceLevel): string {
	switch (level) {
		case ConfidenceLevel.HIGH:
			return 'High confidence - safe for automatic download';
		case ConfidenceLevel.MEDIUM:
			return 'Medium confidence - download with caution, verify match';
		case ConfidenceLevel.LOW:
			return 'Low confidence - likely incorrect match, skip';
	}
}

/**
 * Check if result should be auto-downloaded based on confidence
 */
export function shouldAutoDownload(result: MatchResult): boolean {
	return result.level === ConfidenceLevel.HIGH;
}

/**
 * Check if result should be skipped based on confidence
 */
export function shouldSkip(result: MatchResult): boolean {
	return result.level === ConfidenceLevel.LOW;
}
