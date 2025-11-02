import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { logger } from '../logger';

/**
 * Ensures the database directory exists
 */
function ensureDatabaseDirectory(dbPath: string): void {
	const dir = dirname(dbPath);
	if (!existsSync(dir)) {
		logger.info(`Creating database directory: ${dir}`);
		mkdirSync(dir, { recursive: true });
	}
}

/**
 * Checks if database file exists
 */
function databaseExists(dbPath: string): boolean {
	return existsSync(dbPath);
}

/**
 * Checks if migrations directory exists and has migration files
 */
function hasMigrations(migrationsPath: string): boolean {
	if (!existsSync(migrationsPath)) {
		logger.warn(`Migrations directory not found: ${migrationsPath}`);
		return false;
	}

	const files = readdirSync(migrationsPath);
	const sqlFiles = files.filter((f) => f.endsWith('.sql'));
	
	return sqlFiles.length > 0;
}

/**
 * Initializes the database and runs migrations
 * This should be called once at application startup
 */
export async function initializeDatabase(dbPath: string): Promise<void> {
	const isNewDatabase = !databaseExists(dbPath);
	
	if (isNewDatabase) {
		logger.info('Database file not found, creating new database');
	} else {
		logger.info('Database file found, checking for pending migrations');
	}

	// Ensure the database directory exists
	ensureDatabaseDirectory(dbPath);

	// Create database connection
	const client = new Database(dbPath);
	const db = drizzle(client);

	// Determine migrations path (relative to project root)
	const migrationsPath = join(process.cwd(), 'drizzle');

	// Check if migrations exist
	if (!hasMigrations(migrationsPath)) {
		logger.warn('No migrations found, skipping migration step');
		client.close();
		return;
	}

	try {
		logger.info('Running database migrations...');
		
		// Run migrations
		migrate(db, { migrationsFolder: migrationsPath });
		
		if (isNewDatabase) {
			logger.info('Database created and migrations applied successfully');
		} else {
			logger.info('Database migrations applied successfully');
		}
	} catch (error) {
		logger.error('Failed to run database migrations', error);
		throw new Error(`Database migration failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		client.close();
	}
}

