import type { UserSession } from '$lib/types/user';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: UserSession;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
