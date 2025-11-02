import { logger } from './logger';

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key);
		}
	}
}, 5 * 60 * 1000);

export interface RateLimitConfig {
	/**
	 * Maximum number of requests allowed in the window
	 */
	maxRequests: number;
	/**
	 * Time window in milliseconds
	 */
	windowMs: number;
	/**
	 * Optional key prefix for different rate limit buckets
	 */
	keyPrefix?: string;
}

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier for the client (e.g., IP address, user ID)
 * @param config Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
	identifier: string,
	config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
	const key = config.keyPrefix ? `${config.keyPrefix}:${identifier}` : identifier;
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	// No entry or expired entry - allow and create new
	if (!entry || entry.resetAt < now) {
		const resetAt = now + config.windowMs;
		rateLimitStore.set(key, { count: 1, resetAt });
		logger.debug('Rate limit check - new window', { identifier: key, remaining: config.maxRequests - 1 });
		return {
			allowed: true,
			remaining: config.maxRequests - 1,
			resetAt
		};
	}

	// Entry exists and is valid
	if (entry.count < config.maxRequests) {
		entry.count++;
		logger.debug('Rate limit check - within limit', { identifier: key, count: entry.count, remaining: config.maxRequests - entry.count });
		return {
			allowed: true,
			remaining: config.maxRequests - entry.count,
			resetAt: entry.resetAt
		};
	}

	// Rate limit exceeded
	logger.warn('Rate limit exceeded', { identifier: key, count: entry.count, maxRequests: config.maxRequests });
	return {
		allowed: false,
		remaining: 0,
		resetAt: entry.resetAt
	};
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or manual resets
 */
export function resetRateLimit(identifier: string, keyPrefix?: string): void {
	const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
	rateLimitStore.delete(key);
	logger.info('Rate limit reset', { identifier: key });
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
	identifier: string,
	config: RateLimitConfig
): { count: number; remaining: number; resetAt: number } | null {
	const key = config.keyPrefix ? `${config.keyPrefix}:${identifier}` : identifier;
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	if (!entry || entry.resetAt < now) {
		return null;
	}

	return {
		count: entry.count,
		remaining: Math.max(0, config.maxRequests - entry.count),
		resetAt: entry.resetAt
	};
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
	// Auth endpoints: 5 attempts per 15 minutes
	AUTH: {
		maxRequests: 5,
		windowMs: 15 * 60 * 1000,
		keyPrefix: 'auth'
	},
	// API endpoints: 100 requests per minute
	API: {
		maxRequests: 100,
		windowMs: 60 * 1000,
		keyPrefix: 'api'
	},
	// Search endpoints: 30 requests per minute (more expensive operations)
	SEARCH: {
		maxRequests: 30,
		windowMs: 60 * 1000,
		keyPrefix: 'search'
	}
} as const;

