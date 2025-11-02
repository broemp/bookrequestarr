import { db } from './db';
import { apiCache, settings } from './db/schema';
import { eq, lt } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Default cache TTL in milliseconds (7 days)
 */
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the configured cache TTL from settings or use default
 */
async function getCacheTTL(): Promise<number> {
	try {
		const [setting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'api_cache_ttl_days'))
			.limit(1);

		if (setting?.value) {
			const days = parseInt(setting.value, 10);
			if (!isNaN(days) && days > 0) {
				return days * 24 * 60 * 60 * 1000;
			}
		}
	} catch (error) {
		logger.error('Error fetching cache TTL setting', error);
	}

	return DEFAULT_CACHE_TTL_MS;
}

/**
 * Generate SHA-256 hash of a string
 */
async function hashString(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a cache key from request data
 */
export async function createCacheKey(
	query: string,
	variables?: Record<string, unknown>
): Promise<string> {
	const requestData = JSON.stringify({ query, variables: variables || {} });
	return await hashString(requestData);
}

/**
 * Get cached API response if available and not expired
 */
export async function getCachedResponse<T>(
	query: string,
	variables?: Record<string, unknown>
): Promise<T | null> {
	try {
		const cacheKey = await createCacheKey(query, variables);

		const [cached] = await db
			.select()
			.from(apiCache)
			.where(eq(apiCache.requestHash, cacheKey))
			.limit(1);

		if (!cached) {
			return null;
		}

		// Check if cache is expired
		if (cached.expiresAt < new Date()) {
			// Clean up expired cache entry
			await db.delete(apiCache).where(eq(apiCache.requestHash, cacheKey));
			return null;
		}

		// Return cached response
		logger.debug('Cache hit for API request');
		return JSON.parse(cached.responseData) as T;
	} catch (error) {
		logger.error('Error retrieving cached response', error);
		return null;
	}
}

/**
 * Store API response in cache
 */
export async function setCachedResponse(
	query: string,
	variables: Record<string, unknown> | undefined,
	response: unknown
): Promise<void> {
	try {
		const cacheKey = await createCacheKey(query, variables);
		const requestData = JSON.stringify({ query, variables: variables || {} });
		const responseData = JSON.stringify(response);
		const ttl = await getCacheTTL();
		const expiresAt = new Date(Date.now() + ttl);

		// Upsert cache entry
		await db
			.insert(apiCache)
			.values({
				requestHash: cacheKey,
				requestData,
				responseData,
				expiresAt
			})
			.onConflictDoUpdate({
				target: apiCache.requestHash,
				set: {
					responseData,
					expiresAt,
					createdAt: new Date()
				}
			});
		logger.debug('Stored API response in cache');
	} catch (error) {
		logger.error('Error storing cached response', error);
	}
}

/**
 * Clear all expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
	try {
		const result = await db.delete(apiCache).where(lt(apiCache.expiresAt, new Date()));
		const count = result.changes || 0;
		if (count > 0) {
			logger.info(`Cleaned up ${count} expired cache entries`);
		}
		return count;
	} catch (error) {
		logger.error('Error cleaning up expired cache', error);
		return 0;
	}
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
	try {
		await db.delete(apiCache);
		logger.info('Cleared all cache entries');
	} catch (error) {
		logger.error('Error clearing all cache', error);
	}
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
	totalEntries: number;
	expiredEntries: number;
}> {
	try {
		const allEntries = await db.select().from(apiCache);
		const now = new Date();

		return {
			totalEntries: allEntries.length,
			expiredEntries: allEntries.filter((entry) => entry.expiresAt < now).length
		};
	} catch (error) {
		logger.error('Error getting cache stats', error);
		return { totalEntries: 0, expiredEntries: 0 };
	}
}
