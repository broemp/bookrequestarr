import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { checkRateLimit, type RateLimitConfig } from './rateLimit';

/**
 * Get client identifier from request
 * Uses IP address as the primary identifier
 */
function getClientIdentifier(event: RequestEvent): string {
	// Try to get real IP from headers (for reverse proxy setups)
	const forwardedFor = event.request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		// Take the first IP in the list
		return forwardedFor.split(',')[0].trim();
	}

	const realIp = event.request.headers.get('x-real-ip');
	if (realIp) {
		return realIp;
	}

	// Fallback to client address from platform
	return event.getClientAddress();
}

/**
 * Apply rate limiting to a request handler
 * Returns a Response if rate limited, null if allowed
 */
export function applyRateLimit(
	event: RequestEvent,
	config: RateLimitConfig
): Response | null {
	const identifier = getClientIdentifier(event);
	const result = checkRateLimit(identifier, config);

	// Set rate limit headers
	const headers = new Headers({
		'X-RateLimit-Limit': config.maxRequests.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
	});

	if (!result.allowed) {
		const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
		headers.set('Retry-After', retryAfter.toString());

		return new Response(
			JSON.stringify({
				error: 'Too many requests',
				message: 'Rate limit exceeded. Please try again later.',
				retryAfter
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					...Object.fromEntries(headers)
				}
			}
		);
	}

	// Request is allowed, but we can't easily add headers to the response here
	// The calling code should handle adding rate limit headers if needed
	return null;
}

/**
 * Helper to add rate limit headers to a response
 */
export function addRateLimitHeaders(
	response: Response,
	limit: number,
	remaining: number,
	resetAt: number
): Response {
	const headers = new Headers(response.headers);
	headers.set('X-RateLimit-Limit', limit.toString());
	headers.set('X-RateLimit-Remaining', remaining.toString());
	headers.set('X-RateLimit-Reset', new Date(resetAt).toISOString());

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

