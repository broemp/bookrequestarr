import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null };
	}

	// For dev admin (DISABLE_AUTH mode), return the session user directly
	if (locals.user.id === 'dev-admin') {
		return {
			user: {
				id: locals.user.id,
				email: locals.user.email,
				username: locals.user.username,
				displayName: locals.user.displayName,
				preferredLanguage: locals.user.preferredLanguage || 'English'
			}
		};
	}

	// Get full user data including preferences
	const [user] = await db.select().from(users).where(eq(users.id, locals.user.id)).limit(1);

	if (!user) {
		return { user: null };
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			displayName: user.displayName,
			preferredLanguage: user.preferredLanguage || 'English'
		}
	};
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const preferredLanguage = formData.get('preferredLanguage') as string;

		if (!preferredLanguage) {
			return fail(400, { error: 'Preferred language is required' });
		}

		// For dev admin (DISABLE_AUTH mode), just return success (no database to update)
		if (locals.user.id === 'dev-admin') {
			return { success: true };
		}

		try {
			await db
				.update(users)
				.set({
					preferredLanguage,
					updatedAt: new Date()
				})
				.where(eq(users.id, locals.user.id));

			return { success: true };
		} catch (error) {
			console.error('Error updating preferences:', error);
			return fail(500, { error: 'Failed to update preferences' });
		}
	}
};
