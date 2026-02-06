import { OAuth2Client } from 'arctic';
import { db } from './db';
import { sessions, users } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { UserSession } from '$lib/types/user';

/**
 * OIDC client for authentication using generic OAuth2 provider
 * Configured to work with Authelia OIDC endpoints
 */
export function getOIDCClient() {
	const issuer = env.OIDC_ISSUER;
	const clientId = env.OIDC_CLIENT_ID;
	const clientSecret = env.OIDC_CLIENT_SECRET;
	const redirectUri = env.OIDC_REDIRECT_URI;

	if (!issuer || !clientId || !clientSecret || !redirectUri) {
		throw new Error('OIDC configuration is incomplete');
	}

	// OAuth2Client constructor: (clientId, clientPassword, redirectURI)
	return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Get OIDC endpoints from the issuer
 */
export function getOIDCEndpoints() {
	const issuer = env.OIDC_ISSUER;
	return {
		authorization: `${issuer}/api/oidc/authorization`,
		token: `${issuer}/api/oidc/token`,
		userinfo: `${issuer}/api/oidc/userinfo`
	};
}

/**
 * Validate the OAuth callback parameters
 */
export function validateCallbackParams(params: {
	code: string | null;
	state: string | null;
	storedState: string | undefined;
	codeVerifier: string | undefined;
}): { valid: boolean; error?: string } {
	const { code, state, storedState, codeVerifier } = params;

	if (!code) {
		return { valid: false, error: 'Missing authorization code' };
	}

	if (!state) {
		return { valid: false, error: 'Missing state parameter' };
	}

	if (!storedState) {
		return { valid: false, error: 'Missing stored state (session expired?)' };
	}

	if (state !== storedState) {
		return { valid: false, error: 'State mismatch (possible CSRF attack)' };
	}

	if (!codeVerifier) {
		return { valid: false, error: 'Missing code verifier (session expired?)' };
	}

	return { valid: true };
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
	const token = generateToken();
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	await db.insert(sessions).values({
		userId,
		token,
		expiresAt
	});

	return token;
}

/**
 * Validate a session token and return the user
 */
export async function validateSession(token: string): Promise<UserSession | null> {
	const [session] = await db
		.select({
			userId: sessions.userId,
			expiresAt: sessions.expiresAt,
			email: users.email,
			username: users.username,
			displayName: users.displayName,
			role: users.role,
			preferredLanguage: users.preferredLanguage,
			lastUsedLanguage: users.lastUsedLanguage,
			lastUsedFormat: users.lastUsedFormat
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
		.limit(1);

	if (!session) {
		return null;
	}

	return {
		id: session.userId,
		email: session.email,
		username: session.username,
		displayName: session.displayName,
		role: session.role as 'user' | 'admin',
		preferredLanguage: session.preferredLanguage || undefined,
		lastUsedLanguage: session.lastUsedLanguage,
		lastUsedFormat: session.lastUsedFormat
	};
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.token, token));
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Check if user is in a specific OIDC group
 */
export function isInGroup(groups: string[], requiredGroup: string): boolean {
	return groups.some((group) => group === requiredGroup || group.endsWith(`/${requiredGroup}`));
}

/**
 * Determine user role from OIDC groups
 */
export function getUserRoleFromGroups(groups: string[]): 'admin' | 'user' {
	const adminGroup = env.OIDC_ADMIN_GROUP || 'bookrequestarr_admin';
	return isInGroup(groups, adminGroup) ? 'admin' : 'user';
}

/**
 * Find or create user from OIDC profile
 */
export async function findOrCreateUser(profile: {
	sub: string;
	email: string;
	preferred_username?: string;
	name?: string;
	groups?: string[];
}): Promise<string> {
	// Check if user exists by OIDC sub
	const [existingUser] = await db
		.select()
		.from(users)
		.where(eq(users.oidcSub, profile.sub))
		.limit(1);

	const role = getUserRoleFromGroups(profile.groups || []);

	if (existingUser) {
		// Update user info if changed
		await db
			.update(users)
			.set({
				email: profile.email,
				displayName: profile.name || profile.preferred_username || profile.email,
				role,
				updatedAt: new Date()
			})
			.where(eq(users.id, existingUser.id));

		return existingUser.id;
	}

	// Create new user
	const username =
		profile.preferred_username || profile.email.split('@')[0] || `user_${profile.sub.slice(0, 8)}`;

	const [newUser] = await db
		.insert(users)
		.values({
			email: profile.email,
			username,
			displayName: profile.name || username,
			role,
			oidcSub: profile.sub
		})
		.returning();

	return newUser.id;
}
