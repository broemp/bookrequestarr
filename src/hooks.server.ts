import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import { validateEnvOrExit } from '$lib/server/envValidation';
import { cleanupOldDownloads } from '$lib/server/cleanup';
import { updateSabnzbdDownloadStatuses } from '$lib/server/downloadOrchestrator';
import { initializeSettings } from '$lib/server/settingsInit';

// Validate environment variables at startup
validateEnvOrExit();

// Initialize settings from environment variables
initializeSettings().catch((error) => {
	logger.error('Failed to initialize settings', error instanceof Error ? error : undefined);
});

// Run cleanup every hour
setInterval(
	async () => {
		try {
			await cleanupOldDownloads();
		} catch (error) {
			logger.error('Cleanup job failed', error instanceof Error ? error : undefined);
		}
	},
	60 * 60 * 1000
); // 1 hour

// Run cleanup on startup (after 1 minute delay)
setTimeout(async () => {
	try {
		await cleanupOldDownloads();
	} catch (error) {
		logger.error('Initial cleanup failed', error instanceof Error ? error : undefined);
	}
}, 60 * 1000);

// Run SABnzbd status polling every 30 seconds
setInterval(async () => {
	try {
		await updateSabnzbdDownloadStatuses();
	} catch (error) {
		logger.error('SABnzbd status polling failed', error instanceof Error ? error : undefined);
	}
}, 30 * 1000); // 30 seconds

// Run SABnzbd status polling on startup (after 10 seconds delay to allow server to fully initialize)
setTimeout(async () => {
	try {
		await updateSabnzbdDownloadStatuses();
	} catch (error) {
		logger.error('Initial SABnzbd status check failed', error instanceof Error ? error : undefined);
	}
}, 10 * 1000);

// Track if dev user has been created
let devUserCreated = false;

// Ensure dev admin user exists in database
async function ensureDevUser() {
	if (devUserCreated) return;

	const devUserId = 'dev-admin';
	const [existingUser] = await db.select().from(users).where(eq(users.id, devUserId)).limit(1);

	if (!existingUser) {
		await db.insert(users).values({
			id: devUserId,
			email: 'admin@localhost',
			username: 'admin',
			displayName: 'Development Admin',
			role: 'admin',
			preferredLanguage: 'English'
		});
		logger.info('Created dev admin user');
	}

	devUserCreated = true;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Check if auth is disabled (for development)
	if (env.DISABLE_AUTH === 'true') {
		// Ensure dev user exists in database
		await ensureDevUser();

		// Automatically log in as admin
		event.locals.user = {
			id: 'dev-admin',
			email: 'admin@localhost',
			username: 'admin',
			displayName: 'Development Admin',
			role: 'admin',
			preferredLanguage: 'English'
		};
		return resolve(event);
	}

	// Get session token from cookie
	const sessionToken = event.cookies.get('session');

	if (sessionToken) {
		// Validate session and attach user to locals
		const user = await validateSession(sessionToken);
		if (user) {
			event.locals.user = user;
		}
	}

	return resolve(event);
};
