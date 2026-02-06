import type { users } from '$lib/server/db/schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserRole = 'user' | 'admin';

export interface UserSession {
	id: string;
	email: string;
	username: string;
	displayName: string;
	role: UserRole;
	preferredLanguage?: string;
	lastUsedLanguage?: string | null;
	lastUsedFormat?: 'ebook' | 'audiobook' | null;
}
