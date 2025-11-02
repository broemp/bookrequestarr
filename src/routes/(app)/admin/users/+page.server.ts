import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	// Get all users
	const allUsers = await db.select().from(users);

	return {
		users: allUsers
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
			console.error('Error creating user:', error);
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
			console.error('Error promoting user:', error);
			return fail(500, { error: 'Failed to promote user' });
		}
	}
};
