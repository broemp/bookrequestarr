import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOIDCClient, getOIDCEndpoints, findOrCreateUser, createSession, isInGroup } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import { applyRateLimit } from '$lib/server/rateLimitMiddleware';
import { RATE_LIMITS } from '$lib/server/rateLimit';

interface OIDCUserInfo {
	sub: string;
	email: string;
	preferred_username?: string;
	name?: string;
	groups?: string[];
}

export const GET: RequestHandler = async (event) => {
	const { url, cookies } = event;

	// Apply rate limiting
	const rateLimitResponse = applyRateLimit(event, RATE_LIMITS.AUTH);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oauth_state');
	const codeVerifier = cookies.get('oauth_code_verifier');

	// Validate state and code verifier
	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		logger.warn('Invalid OAuth state or missing code verifier', { hasCode: !!code, hasState: !!state, stateMatch: state === storedState });
		throw redirect(302, '/login?error=invalid_state');
	}

	// Clear state and code verifier cookies
	cookies.delete('oauth_state', { path: '/' });
	cookies.delete('oauth_code_verifier', { path: '/' });

	try {
		const client = getOIDCClient();
		const endpoints = getOIDCEndpoints();

		// Exchange code for tokens using PKCE
		// OAuth2Client.validateAuthorizationCode takes (tokenEndpoint, code, codeVerifier)
		const tokens = await client.validateAuthorizationCode(endpoints.token, code, codeVerifier);

		// Fetch user info
		const userInfoResponse = await fetch(endpoints.userinfo, {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`
			}
		});

		if (!userInfoResponse.ok) {
			throw new Error('Failed to fetch user info');
		}

		const userInfo: OIDCUserInfo = await userInfoResponse.json();

		// Check if user is in allowed groups
		const userGroup = env.OIDC_USER_GROUP || 'bookrequestarr';
		const adminGroup = env.OIDC_ADMIN_GROUP || 'bookrequestarr_admin';

		if (
			!isInGroup(userInfo.groups || [], userGroup) &&
			!isInGroup(userInfo.groups || [], adminGroup)
		) {
			throw redirect(302, '/login?error=unauthorized');
		}

		// Find or create user
		const userId = await findOrCreateUser(userInfo);

		// Create session
		const sessionToken = await createSession(userId);

		// Set session cookie
		cookies.set('session', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		throw redirect(302, '/dashboard');
	} catch (error) {
		// Re-throw SvelteKit redirects and responses
		if (error instanceof Response || (error && typeof error === 'object' && 'status' in error && 'location' in error)) {
			throw error;
		}
		logger.error('Error in OAuth callback', error instanceof Error ? error : undefined);
		redirect(302, '/login?error=auth_failed');
	}
};
