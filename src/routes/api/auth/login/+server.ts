import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOIDCClient, getOIDCEndpoints, generateToken } from '$lib/server/auth';
import { generateCodeVerifier, CodeChallengeMethod } from 'arctic';
import { logger } from '$lib/server/logger';
import { applyRateLimit } from '$lib/server/rateLimitMiddleware';
import { RATE_LIMITS } from '$lib/server/rateLimit';

export const GET: RequestHandler = async (event) => {
	const { cookies, url } = event;

	// Apply rate limiting
	const rateLimitResponse = applyRateLimit(event, RATE_LIMITS.AUTH);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const client = getOIDCClient();
		const endpoints = getOIDCEndpoints();
		const state = generateToken();
		const codeVerifier = generateCodeVerifier(); // PKCE code verifier
		const scopes = ['openid', 'profile', 'email', 'groups'];

		// Store state and code verifier in cookies for validation
		cookies.set('oauth_state', state, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 60 * 10 // 10 minutes
		});

		cookies.set('oauth_code_verifier', codeVerifier, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 60 * 10 // 10 minutes
		});

		// OAuth2Client's createAuthorizationURLWithPKCE takes (authorizationEndpoint, state, codeChallengeMethod, codeVerifier, scopes)
		const authUrl = client.createAuthorizationURLWithPKCE(
			endpoints.authorization,
			state,
			CodeChallengeMethod.S256,
			codeVerifier,
			scopes
		);

		redirect(302, authUrl.toString());
	} catch (error) {
		// Re-throw SvelteKit redirects and responses
		if (
			error instanceof Response ||
			(error && typeof error === 'object' && 'status' in error && 'location' in error)
		) {
			throw error;
		}
		logger.error('Error initiating OIDC login', error instanceof Error ? error : undefined);
		redirect(302, '/login?error=auth_failed');
	}
};
