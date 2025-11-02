import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Require admin role
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/dashboard');
	}

	return {
		user: locals.user
	};
};
