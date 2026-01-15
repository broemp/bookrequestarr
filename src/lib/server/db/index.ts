import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { initializeDatabase } from './migrate';
import { logger } from '../logger';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Track initialization state
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Ensures the database is initialized before use
 * This is called automatically on first database access
 */
async function ensureInitialized(): Promise<void> {
	if (initialized) return;

	// If initialization is in progress, wait for it
	if (initPromise) {
		await initPromise;
		return;
	}

	// Start initialization
	initPromise = (async () => {
		try {
			await initializeDatabase(env.DATABASE_URL!);
			initialized = true;
			logger.info('Database initialization complete');
		} catch (error) {
			logger.error('Failed to initialize database', error);
			throw error;
		} finally {
			initPromise = null;
		}
	})();

	await initPromise;
}

// Initialize database on module load
ensureInitialized().catch((error) => {
	logger.error('Critical: Database initialization failed on startup', error);
	process.exit(1);
});

const client = new Database(env.DATABASE_URL);

export const db = drizzle(client, { schema });
