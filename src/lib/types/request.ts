import type { requests } from '$lib/server/db/schema';
import type { Book } from './book';
import type { User } from './user';

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'download_problem';

export interface RequestWithDetails extends Request {
	book: Book;
	user: User;
}
