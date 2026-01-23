import { db } from './db';
import { settings } from './db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { logger } from './logger';

/**
 * Environment variable to database setting key mapping
 */
const ENV_TO_SETTING_MAP: Record<string, string> = {
	HARDCOVER_API_KEY: 'hardcover_api_key',
	DISCORD_WEBHOOK_URL: 'discord_webhook_url',
	TELEGRAM_BOT_TOKEN: 'telegram_bot_token',
	TELEGRAM_CHAT_ID: 'telegram_chat_id',
	ANNAS_ARCHIVE_DOMAIN: 'annas_archive_domain',
	ANNAS_ARCHIVE_API_KEY: 'annas_archive_api_key',
	DOWNLOAD_DIRECTORY: 'download_directory',
	DOWNLOAD_DAILY_LIMIT: 'download_daily_limit',
	PROWLARR_URL: 'prowlarr_url',
	PROWLARR_API_KEY: 'prowlarr_api_key',
	SABNZBD_URL: 'sabnzbd_url',
	SABNZBD_API_KEY: 'sabnzbd_api_key',
	SABNZBD_CATEGORY: 'sabnzbd_category'
};

/**
 * Default values for settings
 */
const SETTING_DEFAULTS: Record<string, string> = {
	download_directory: './data/downloads',
	download_daily_limit: '25',
	download_auto_mode: 'disabled',
	download_auto_select: 'true',
	api_cache_ttl_days: '7',
	local_book_cache_ttl_hours: '6',
	annas_archive_domain: 'annas-archive.org',
	calibre_cleanup_hours: '24',
	calibre_cleanup_enabled: 'false',
	prowlarr_enabled: 'false',
	min_confidence_score: '50',
	sabnzbd_category: 'books',
	download_source_priority: 'prowlarr_first'
};

/**
 * Initialize settings from environment variables on first startup
 * This ensures that environment variables take precedence over defaults
 * but doesn't override existing database settings
 */
export async function initializeSettings(): Promise<void> {
	try {
		logger.info('Initializing settings from environment variables');

		// Get all existing settings from database
		const existingSettings = await db.select().from(settings);
		const existingKeys = new Set(existingSettings.map((s) => s.key));

		const settingsToInsert: { key: string; value: string }[] = [];

		// Process environment variables
		for (const [envKey, settingKey] of Object.entries(ENV_TO_SETTING_MAP)) {
			const envValue = env[envKey];

			// Only insert if:
			// 1. Environment variable is set, AND
			// 2. Setting doesn't already exist in database
			if (envValue && !existingKeys.has(settingKey)) {
				settingsToInsert.push({
					key: settingKey,
					value: envValue
				});
				logger.debug('Setting from environment variable', { key: settingKey, source: 'env' });
			}
		}

		// Insert default values for settings that don't exist and have no env var
		for (const [settingKey, defaultValue] of Object.entries(SETTING_DEFAULTS)) {
			if (!existingKeys.has(settingKey)) {
				// Check if we already added this from env vars
				const alreadyAdded = settingsToInsert.some((s) => s.key === settingKey);
				if (!alreadyAdded) {
					settingsToInsert.push({
						key: settingKey,
						value: defaultValue
					});
					logger.debug('Setting default value', { key: settingKey, value: defaultValue });
				}
			}
		}

		// Insert all new settings
		if (settingsToInsert.length > 0) {
			for (const setting of settingsToInsert) {
				await db.insert(settings).values(setting);
			}
			logger.info('Initialized settings', { count: settingsToInsert.length });
		} else {
			logger.debug('No new settings to initialize');
		}
	} catch (error) {
		logger.error('Error initializing settings', error instanceof Error ? error : undefined);
		// Don't throw - we want the app to continue even if settings init fails
	}
}

/**
 * Get a setting value with fallback to environment variable and default
 * This is a helper function for other modules to use
 */
export async function getSetting(
	key: string,
	envKey?: string,
	defaultValue?: string
): Promise<string | null> {
	try {
		// Try database first
		const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

		if (setting) {
			return setting.value;
		}

		// Fall back to environment variable if provided
		if (envKey && env[envKey]) {
			return env[envKey];
		}

		// Fall back to default value if provided
		if (defaultValue !== undefined) {
			return defaultValue;
		}

		return null;
	} catch (error) {
		logger.error('Error getting setting', error instanceof Error ? error : undefined, { key });

		// Fall back to environment variable on error
		if (envKey && env[envKey]) {
			return env[envKey];
		}

		// Fall back to default value on error
		if (defaultValue !== undefined) {
			return defaultValue;
		}

		return null;
	}
}
