import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, accessSync, constants } from 'fs';
import { dirname, join, resolve } from 'path';
import { logger } from '../logger';

/**
 * Ensures the database directory exists and is writable
 */
function ensureDatabaseDirectory(dbPath: string): void {
	const dir = dirname(dbPath);

	// Resolve to absolute path
	const absoluteDir = resolve(dir);

	if (!existsSync(absoluteDir)) {
		logger.info(`Creating database directory: ${absoluteDir}`);
		try {
			mkdirSync(absoluteDir, { recursive: true, mode: 0o755 });
		} catch (error) {
			logger.error(`Failed to create database directory: ${absoluteDir}`, error);
			throw new Error(
				`Cannot create database directory: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// Verify directory is writable
	try {
		accessSync(absoluteDir, constants.W_OK | constants.R_OK);
	} catch (error) {
		logger.error(`Database directory is not writable: ${absoluteDir}`, error);
		throw new Error(
			`Database directory is not writable: ${absoluteDir}. Please check permissions.`
		);
	}

	logger.info(`Database directory verified: ${absoluteDir}`);
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
	// Resolve to absolute path
	const absoluteDbPath = resolve(dbPath);
	const isNewDatabase = !databaseExists(absoluteDbPath);

	if (isNewDatabase) {
		logger.info(`Database file not found, creating new database at: ${absoluteDbPath}`);
	} else {
		logger.info(`Database file found at: ${absoluteDbPath}, checking for pending migrations`);
	}

	// Ensure the database directory exists and is writable
	ensureDatabaseDirectory(absoluteDbPath);

	// Create database connection
	let client: Database.Database;
	try {
		client = new Database(absoluteDbPath);
		logger.info('Database connection established successfully');
	} catch (error) {
		logger.error(`Failed to open database at ${absoluteDbPath}`, error);
		throw new Error(
			`Cannot open database: ${error instanceof Error ? error.message : String(error)}`
		);
	}

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
		throw new Error(
			`Database migration failed: ${error instanceof Error ? error.message : String(error)}`
		);
	} finally {
		client.close();
	}
}
