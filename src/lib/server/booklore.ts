import { logger } from './logger';
import { getSetting } from './settingsInit';
import { env } from '$env/dynamic/private';

/**
 * Booklore integration configuration
 */
export interface BookloreConfig {
	enabled: boolean;
	baseUrl?: string;
	bookdropPath?: string;
	apiKey?: string;
	verifyImports: boolean;
}

/**
 * Get Booklore configuration from settings and environment variables
 * Environment variables take precedence over database settings
 */
export async function getBookloreConfig(): Promise<BookloreConfig> {
	const enabled =
		env.BOOKLORE_ENABLED === 'true' ||
		(await getSetting('booklore_enabled', 'false')) === 'true';

	const baseUrl =
		env.BOOKLORE_BASE_URL || (await getSetting('booklore_base_url', '')) || undefined;

	const bookdropPath =
		env.BOOKLORE_BOOKDROP_PATH ||
		(await getSetting('booklore_bookdrop_path', '')) ||
		undefined;

	const apiKey =
		env.BOOKLORE_API_KEY || (await getSetting('booklore_api_key', '')) || undefined;

	const verifyImports =
		env.BOOKLORE_VERIFY_IMPORTS === 'true' ||
		(await getSetting('booklore_verify_imports', 'false')) === 'true';

	return {
		enabled,
		baseUrl,
		bookdropPath,
		apiKey,
		verifyImports
	};
}

/**
 * Copy downloaded book file to Booklore BookDrop folder for automatic import
 *
 * @param filePath - Path to the downloaded book file
 * @returns true if file was copied successfully, false otherwise
 */
export async function copyToBookdrop(filePath: string): Promise<boolean> {
	const config = await getBookloreConfig();

	if (!config.enabled) {
		logger.debug('Booklore integration disabled, skipping BookDrop copy');
		return false;
	}

	if (!config.bookdropPath) {
		logger.warn('Booklore enabled but BookDrop path not configured', { filePath });
		return false;
	}

	try {
		const fs = await import('fs/promises');
		const path = await import('path');

		// Verify source file exists
		try {
			await fs.access(filePath);
		} catch {
			logger.error('Source file does not exist or is not accessible', undefined, { filePath });
			return false;
		}

		// Verify BookDrop directory exists
		try {
			const stats = await fs.stat(config.bookdropPath);
			if (!stats.isDirectory()) {
				logger.error('BookDrop path is not a directory', undefined, {
					bookdropPath: config.bookdropPath
				});
				return false;
			}
		} catch {
			logger.error('BookDrop directory does not exist or is not accessible', undefined, {
				bookdropPath: config.bookdropPath
			});
			return false;
		}

		const fileName = path.basename(filePath);
		const destPath = path.join(config.bookdropPath, fileName);

		// Copy file to BookDrop folder
		await fs.copyFile(filePath, destPath);
		logger.info('Successfully copied file to Booklore BookDrop', { fileName, destPath });

		// Optional: Verify import via API
		if (config.verifyImports && config.baseUrl && config.apiKey) {
			await verifyBookloreImport(fileName, config);
		}

		return true;
	} catch (error) {
		logger.error('Failed to copy file to Booklore BookDrop', error instanceof Error ? error : undefined, {
			filePath,
			bookdropPath: config.bookdropPath
		});
		return false;
	}
}

/**
 * Verify that Booklore successfully imported the file
 * This is optional and requires Booklore API access
 *
 * @param fileName - Name of the file that was copied to BookDrop
 * @param config - Booklore configuration
 */
async function verifyBookloreImport(fileName: string, config: BookloreConfig): Promise<void> {
	if (!config.baseUrl) {
		logger.debug('Cannot verify import: Booklore base URL not configured');
		return;
	}

	try {
		logger.debug('Verifying Booklore import', { fileName });

		// Note: Booklore's API endpoints for checking imports may vary
		// This is a placeholder implementation that should be adjusted based on actual API
		// For now, we'll just log that verification was requested but not yet implemented

		logger.info('Booklore import verification requested but not yet implemented', {
			fileName,
			note: 'File was copied to BookDrop successfully. Booklore will auto-import it.'
		});

		// TODO: Implement actual API verification when Booklore API documentation is available
		// Possible approach:
		// 1. Poll /api/v1/books endpoint for recently added books
		// 2. Match by filename or other metadata
		// 3. Confirm import was successful
	} catch (error) {
		logger.warn('Failed to verify Booklore import', {
			error: error instanceof Error ? error.message : 'Unknown error',
			fileName
		});
	}
}

/**
 * Test connection to Booklore API
 *
 * @returns Object with success status and optional error message
 */
export async function testBookloreConnection(): Promise<{ success: boolean; error?: string }> {
	const config = await getBookloreConfig();

	if (!config.enabled) {
		return { success: false, error: 'Booklore integration is disabled' };
	}

	// Check BookDrop path first (primary requirement)
	if (!config.bookdropPath) {
		return { success: false, error: 'BookDrop path not configured' };
	}

	try {
		const fs = await import('fs/promises');
		const stats = await fs.stat(config.bookdropPath);
		if (!stats.isDirectory()) {
			return { success: false, error: 'BookDrop path is not a directory' };
		}

		// Try to write a test file to verify permissions
		const path = await import('path');
		const testFile = path.join(config.bookdropPath, '.bookrequestarr-test');
		try {
			await fs.writeFile(testFile, 'test');
			await fs.unlink(testFile);
		} catch {
			return {
				success: false,
				error: 'BookDrop path exists but is not writable. Check permissions.'
			};
		}
	} catch (error) {
		return {
			success: false,
			error: `BookDrop path error: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}

	// If base URL is configured, test API connection (optional)
	if (config.baseUrl) {
		try {
			const response = await fetch(`${config.baseUrl}/api/v1/healthcheck`, {
				headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
				signal: AbortSignal.timeout(5000) // 5 second timeout
			});

			if (!response.ok) {
				logger.warn('Booklore API health check failed', {
					status: response.status,
					statusText: response.statusText
				});
				// Don't fail the test - BookDrop folder is primary requirement
				return {
					success: true,
					error: `BookDrop OK. API health check failed: HTTP ${response.status}`
				};
			}

			logger.info('Booklore API connection successful');
			return { success: true };
		} catch (error) {
			logger.warn('Booklore API connection failed', {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Don't fail the test - BookDrop folder is primary requirement
			return {
				success: true,
				error: `BookDrop OK. API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	// Success if BookDrop path is valid (even without API)
	return { success: true };
}
