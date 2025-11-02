import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Require authentication for all routes in this layout
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user
	};
};
