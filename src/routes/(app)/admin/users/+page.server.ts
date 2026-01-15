import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users, settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async () => {
	// Get all users
	const allUsers = await db.select().from(users);

	// Get download auto mode setting
	const [autoModeSetting] = await db
		.select()
		.from(settings)
		.where(eq(settings.key, 'download_auto_mode'))
		.limit(1);

	const downloadAutoMode = autoModeSetting?.value || 'disabled';

	return {
		users: allUsers,
		downloadAutoMode
	};
};

export const actions: Actions = {
	createUser: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const username = formData.get('username') as string;
		const displayName = formData.get('displayName') as string;
		const role = formData.get('role') as 'user' | 'admin';

		if (!email || !username || !displayName) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Check if email or username already exists
			const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

			if (existing.length > 0) {
				return fail(400, { error: 'Email already exists' });
			}

			const existingUsername = await db
				.select()
				.from(users)
				.where(eq(users.username, username))
				.limit(1);

			if (existingUsername.length > 0) {
				return fail(400, { error: 'Username already exists' });
			}

			// Create user
			await db.insert(users).values({
				email,
				username,
				displayName,
				role: role || 'user'
			});

			return { success: true };
		} catch (error) {
			logger.error('Error creating user', error instanceof Error ? error : undefined, {
				email,
				username
			});
			return fail(500, { error: 'Failed to create user' });
		}
	},

	promoteUser: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'Missing user ID' });
		}

		try {
			await db
				.update(users)
				.set({
					role: 'admin',
					updatedAt: new Date()
				})
				.where(eq(users.id, userId));

			return { success: true };
		} catch (error) {
			logger.error('Error promoting user', error instanceof Error ? error : undefined, { userId });
			return fail(500, { error: 'Failed to promote user' });
		}
	},

	toggleAutoDownload: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const enabled = formData.get('enabled') === 'true';

		if (!userId) {
			return fail(400, { error: 'Missing user ID' });
		}

		try {
			await db
				.update(users)
				.set({
					autoDownloadEnabled: enabled,
					updatedAt: new Date()
				})
				.where(eq(users.id, userId));

			return { success: true };
		} catch (error) {
			logger.error('Error toggling auto-download', error instanceof Error ? error : undefined, {
				userId,
				enabled
			});
			return fail(500, { error: 'Failed to toggle auto-download' });
		}
	}
};
