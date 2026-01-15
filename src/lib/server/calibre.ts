import { db } from './db';
import { settings } from './db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

/**
 * Check if Calibre-Web integration is enabled
 */
export async function isCalibreEnabled(): Promise<boolean> {
	// Check environment variable first
	if (env.CALIBRE_BASE_URL) {
		return true;
	}

	// Check database setting
	const [setting] = await db
		.select()
		.from(settings)
		.where(eq(settings.key, 'calibre_base_url'))
		.limit(1);

	return !!setting?.value;
}

/**
 * Get Calibre-Web base URL
 */
export async function getCalibreBaseUrl(): Promise<string | null> {
	if (env.CALIBRE_BASE_URL) {
		return env.CALIBRE_BASE_URL;
	}

	const [setting] = await db
		.select()
		.from(settings)
		.where(eq(settings.key, 'calibre_base_url'))
		.limit(1);

	return setting?.value || null;
}

/**
 * Get Calibre-Web search URL for a book
 */
export async function getCalibreSearchUrl(title: string, author?: string): Promise<string | null> {
	const baseUrl = await getCalibreBaseUrl();
	if (!baseUrl) return null;

	// Calibre-Web search format: /search?query=title+author
	const query = author ? `${title} ${author}` : title;
	const encodedQuery = encodeURIComponent(query);

	return `${baseUrl}/search?query=${encodedQuery}`;
}

/**
 * Get cleanup settings
 */
export async function getCleanupSettings(): Promise<{ enabled: boolean; hours: number }> {
	const [enabledSetting] = await db
		.select()
		.from(settings)
		.where(eq(settings.key, 'calibre_cleanup_enabled'))
		.limit(1);

	const [hoursSetting] = await db
		.select()
		.from(settings)
		.where(eq(settings.key, 'calibre_cleanup_hours'))
		.limit(1);

	return {
		enabled: enabledSetting?.value === 'true',
		hours: parseInt(hoursSetting?.value || '24', 10)
	};
}
