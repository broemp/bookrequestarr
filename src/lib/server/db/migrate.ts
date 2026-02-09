import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, readFileSync, accessSync, constants } from 'fs';
import { dirname, join, resolve } from 'path';
import { logger } from '../logger';

/**
 * Required tables that must exist for the application to work
 */
const REQUIRED_TABLES = [
	'users',
	'books',
	'authors',
	'book_authors',
	'tags',
	'book_tags',
	'requests',
	'sessions',
	'notifications',
	'settings',
	'new_releases',
	'downloads',
	'download_stats'
];

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
 * Gets all existing tables in the database
 */
function getExistingTables(client: Database.Database): string[] {
	const result = client
		.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
		.all() as { name: string }[];
	return result.map((r) => r.name);
}

/**
 * Checks which required tables are missing
 */
function getMissingTables(client: Database.Database): string[] {
	const existingTables = getExistingTables(client);
	return REQUIRED_TABLES.filter((table) => !existingTables.includes(table));
}

/**
 * Applies a single migration file manually, handling "already exists" errors
 */
function applyMigrationFile(client: Database.Database, filePath: string): void {
	const content = readFileSync(filePath, 'utf-8');

	// Split by statement breakpoint and execute each statement
	const statements = content
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		if (!statement) continue;

		try {
			client.exec(statement);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			// Ignore "already exists" errors - these are expected when recovering
			if (
				message.includes('already exists') ||
				message.includes('duplicate column name') ||
				message.includes('UNIQUE constraint failed')
			) {
				logger.debug(`Skipping statement (already applied): ${statement.substring(0, 60)}...`);
			} else {
				throw error;
			}
		}
	}
}

/**
 * Recovers missing tables by re-applying migrations
 * This handles the case where the migrations table is out of sync with reality
 */
function recoverMissingTables(
	client: Database.Database,
	migrationsPath: string,
	missingTables: string[]
): void {
	logger.warn(`Database schema is incomplete. Missing tables: ${missingTables.join(', ')}`);
	logger.info('Attempting to recover by re-applying migrations...');

	// Get all migration files sorted
	const migrationFiles = readdirSync(migrationsPath)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	logger.info(`Found ${migrationFiles.length} migration files to check`);

	// Apply each migration file - the handler ignores "already exists" errors
	for (const file of migrationFiles) {
		const filePath = join(migrationsPath, file);
		logger.info(`Applying migration: ${file}`);

		try {
			applyMigrationFile(client, filePath);
		} catch (error) {
			logger.error(`Failed to apply migration ${file}`, error);
			throw new Error(
				`Migration recovery failed on ${file}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	// Verify recovery was successful
	const stillMissing = getMissingTables(client);
	if (stillMissing.length > 0) {
		throw new Error(
			`Migration recovery incomplete. Still missing tables: ${stillMissing.join(', ')}`
		);
	}

	logger.info('Migration recovery completed successfully');
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

		// Run migrations using Drizzle's migrator
		migrate(db, { migrationsFolder: migrationsPath });

		if (isNewDatabase) {
			logger.info('Database created and migrations applied successfully');
		} else {
			logger.info('Database migrations applied successfully');
		}

		// Verify all required tables exist
		const missingTables = getMissingTables(client);
		if (missingTables.length > 0) {
			// Drizzle's migration tracking is out of sync - recover manually
			recoverMissingTables(client, migrationsPath, missingTables);
		}

		// Final verification
		const finalMissing = getMissingTables(client);
		if (finalMissing.length > 0) {
			throw new Error(`Database schema incomplete. Missing tables: ${finalMissing.join(', ')}`);
		}

		logger.info('Database schema verified - all required tables present');
	} catch (error) {
		logger.error('Failed to run database migrations', error);
		throw new Error(
			`Database migration failed: ${error instanceof Error ? error.message : String(error)}`
		);
	} finally {
		client.close();
	}
}
