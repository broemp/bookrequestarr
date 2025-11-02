import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionToken = cookies.get('session');

	if (sessionToken) {
		await deleteSession(sessionToken);
	}

	cookies.delete('session', { path: '/' });

	throw redirect(302, '/login');
};
