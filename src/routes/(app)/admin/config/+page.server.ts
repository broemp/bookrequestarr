import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { settings, users, requests } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { env } from '$env/dynamic/private';

const CENSOR_DOTS = '••••••••';

function censorSecret(value: string): string {
	if (!value) return '';
	if (value.length <= 8) return CENSOR_DOTS;
	return value.slice(0, 4) + CENSOR_DOTS + value.slice(-4);
}

function isCensored(value: string): boolean {
	return value.includes('••••');
}

export const load: PageServerLoad = async () => {
	// Get all settings
	const allSettings = await db.select().from(settings);

	const settingsMap: Record<string, string> = {};
	for (const setting of allSettings) {
		settingsMap[setting.key] = setting.value;
	}

	// Get stats
	const [totalUsers] = await db.select({ count: count() }).from(users);
	const [totalRequests] = await db.select({ count: count() }).from(requests);

	// Check which settings are set via environment variables
	const envOverrides = {
		hardcoverApiKey: !!env.HARDCOVER_API_KEY,
		discordWebhook: !!env.DISCORD_WEBHOOK_URL,
		telegramBotToken: !!env.TELEGRAM_BOT_TOKEN,
		telegramChatId: !!env.TELEGRAM_CHAT_ID,
		annasArchiveDomain: !!env.ANNAS_ARCHIVE_DOMAIN,
		annasArchiveApiKey: !!env.ANNAS_ARCHIVE_API_KEY,
		downloadDirectory: !!env.DOWNLOAD_DIRECTORY,
		downloadTempDirectory: !!env.DOWNLOAD_TEMP_DIRECTORY,
		prowlarrUrl: !!env.PROWLARR_URL,
		prowlarrApiKey: !!env.PROWLARR_API_KEY,
		sabnzbdUrl: !!env.SABNZBD_URL,
		sabnzbdApiKey: !!env.SABNZBD_API_KEY,
		sabnzbdCategory: !!env.SABNZBD_CATEGORY,
		bookloreBaseUrl: !!env.BOOKLORE_BASE_URL,
		bookloreBookdropPath: !!env.BOOKLORE_BOOKDROP_PATH,
		bookloreApiKey: !!env.BOOKLORE_API_KEY
	};

	return {
		settings: {
			hardcoverApiKey: censorSecret(
				env.HARDCOVER_API_KEY || settingsMap['hardcover_api_key'] || ''
			),
			discordWebhook: censorSecret(
				env.DISCORD_WEBHOOK_URL || settingsMap['discord_webhook_url'] || ''
			),
			telegramBotToken: censorSecret(
				env.TELEGRAM_BOT_TOKEN || settingsMap['telegram_bot_token'] || ''
			),
			telegramChatId: env.TELEGRAM_CHAT_ID || settingsMap['telegram_chat_id'] || '',
			localBookCacheTtlHours: settingsMap['local_book_cache_ttl_hours'] || '6',
			annasArchiveDomain:
				env.ANNAS_ARCHIVE_DOMAIN || settingsMap['annas_archive_domain'] || 'annas-archive.org',
			annasArchiveApiKey: censorSecret(
				env.ANNAS_ARCHIVE_API_KEY || settingsMap['annas_archive_api_key'] || ''
			),
			downloadDirectory:
				env.DOWNLOAD_DIRECTORY || settingsMap['download_directory'] || './data/downloads',
			downloadTempDirectory:
				env.DOWNLOAD_TEMP_DIRECTORY ||
				settingsMap['download_temp_directory'] ||
				'./data/downloads-temp',
			downloadAutoMode: settingsMap['download_auto_mode'] || 'disabled',
			downloadDailyLimit: settingsMap['download_daily_limit'] || '25',
			downloadAutoSelect: settingsMap['download_auto_select'] === 'true',
			calibreBaseUrl: settingsMap['calibre_base_url'] || '',
			calibreCleanupEnabled: settingsMap['calibre_cleanup_enabled'] === 'true',
			calibreCleanupHours: settingsMap['calibre_cleanup_hours'] || '24',
			prowlarrEnabled: settingsMap['prowlarr_enabled'] === 'true',
			prowlarrUrl: env.PROWLARR_URL || settingsMap['prowlarr_url'] || '',
			prowlarrApiKey: censorSecret(env.PROWLARR_API_KEY || settingsMap['prowlarr_api_key'] || ''),
			minConfidenceScore: settingsMap['min_confidence_score'] || '50',
			sabnzbdUrl: env.SABNZBD_URL || settingsMap['sabnzbd_url'] || '',
			sabnzbdApiKey: censorSecret(env.SABNZBD_API_KEY || settingsMap['sabnzbd_api_key'] || ''),
			sabnzbdCategory: env.SABNZBD_CATEGORY || settingsMap['sabnzbd_category'] || 'books',
			downloadSourcePriority: settingsMap['download_source_priority'] || 'prowlarr_first',
			bookloreEnabled: settingsMap['booklore_enabled'] === 'true',
			bookloreBaseUrl: env.BOOKLORE_BASE_URL || settingsMap['booklore_base_url'] || '',
			bookloreBookdropPath:
				env.BOOKLORE_BOOKDROP_PATH || settingsMap['booklore_bookdrop_path'] || '',
			bookloreApiKey: censorSecret(env.BOOKLORE_API_KEY || settingsMap['booklore_api_key'] || ''),
			bookloreVerifyImports: settingsMap['booklore_verify_imports'] === 'true'
		},
		envOverrides,
		stats: {
			totalUsers: totalUsers?.count || 0,
			totalRequests: totalRequests?.count || 0
		}
	};
};

export const actions: Actions = {
	updateSettings: async ({ request }) => {
		const formData = await request.formData();

		// Only update settings whose form fields were actually submitted.
		// Each download sub-tab has its own form, so unsubmitted fields must not
		// overwrite existing values.
		const settingsToUpdate: { key: string; value: string }[] = [];
		const envUpdates: { key: string; value: string }[] = [];

		function addSetting(
			formField: string,
			dbKey: string,
			defaultValue: string,
			envKey?: string,
			isSecret?: boolean
		) {
			if (!formData.has(formField)) return;
			const value = (formData.get(formField) as string) || defaultValue;
			if (isSecret && isCensored(value)) return;
			settingsToUpdate.push({ key: dbKey, value });
			if (envKey && value) envUpdates.push({ key: envKey, value });
		}

		function addCheckboxSetting(formField: string, dbKey: string) {
			// Checkboxes are only sent when checked. To distinguish "unchecked" from
			// "not in this form", each form that contains a checkbox also includes a
			// hidden marker field: <formField>__present.
			if (!formData.has(formField + '__present')) return;
			const value = formData.get(formField) === 'on' ? 'true' : 'false';
			settingsToUpdate.push({ key: dbKey, value });
		}

		// General / API settings
		addSetting('hardcoverApiKey', 'hardcover_api_key', '', 'HARDCOVER_API_KEY', true);
		addSetting('discordWebhook', 'discord_webhook_url', '', 'DISCORD_WEBHOOK_URL', true);
		addSetting('telegramBotToken', 'telegram_bot_token', '', 'TELEGRAM_BOT_TOKEN', true);
		addSetting('telegramChatId', 'telegram_chat_id', '', 'TELEGRAM_CHAT_ID');
		addSetting('apiCacheTtlDays', 'api_cache_ttl_days', '7');
		addSetting('localBookCacheTtlHours', 'local_book_cache_ttl_hours', '6');

		// Anna's Archive
		addSetting(
			'annasArchiveDomain',
			'annas_archive_domain',
			'annas-archive.org',
			'ANNAS_ARCHIVE_DOMAIN'
		);
		addSetting('annasArchiveApiKey', 'annas_archive_api_key', '', 'ANNAS_ARCHIVE_API_KEY', true);
		addSetting('downloadDirectory', 'download_directory', './data/downloads');
		addSetting('downloadTempDirectory', 'download_temp_directory', './data/downloads-temp');
		addSetting('downloadAutoMode', 'download_auto_mode', 'disabled');
		addSetting('downloadDailyLimit', 'download_daily_limit', '25');

		// Prowlarr
		addCheckboxSetting('prowlarrEnabled', 'prowlarr_enabled');
		addSetting('prowlarrUrl', 'prowlarr_url', '', 'PROWLARR_URL');
		addSetting('prowlarrApiKey', 'prowlarr_api_key', '', 'PROWLARR_API_KEY', true);
		addSetting('minConfidenceScore', 'min_confidence_score', '50');

		// SABnzbd
		addSetting('sabnzbdUrl', 'sabnzbd_url', '', 'SABNZBD_URL');
		addSetting('sabnzbdApiKey', 'sabnzbd_api_key', '', 'SABNZBD_API_KEY', true);
		addSetting('sabnzbdCategory', 'sabnzbd_category', 'books', 'SABNZBD_CATEGORY');

		// General download settings
		addSetting('downloadSourcePriority', 'download_source_priority', 'prowlarr_first');
		addCheckboxSetting('downloadAutoSelect', 'download_auto_select');
		addSetting('calibreBaseUrl', 'calibre_base_url', '');
		addCheckboxSetting('calibreCleanupEnabled', 'calibre_cleanup_enabled');
		addSetting('calibreCleanupHours', 'calibre_cleanup_hours', '24');

		// Booklore
		addCheckboxSetting('bookloreEnabled', 'booklore_enabled');
		addSetting('bookloreBaseUrl', 'booklore_base_url', '', 'BOOKLORE_BASE_URL');
		addSetting('bookloreBookdropPath', 'booklore_bookdrop_path', '', 'BOOKLORE_BOOKDROP_PATH');
		addSetting('bookloreApiKey', 'booklore_api_key', '', 'BOOKLORE_API_KEY', true);
		addCheckboxSetting('bookloreVerifyImports', 'booklore_verify_imports');

		try {
			for (const setting of settingsToUpdate) {
				const existing = await db
					.select()
					.from(settings)
					.where(eq(settings.key, setting.key))
					.limit(1);

				if (existing.length > 0) {
					await db
						.update(settings)
						.set({ value: setting.value, updatedAt: new Date() })
						.where(eq(settings.key, setting.key));
				} else {
					await db.insert(settings).values(setting);
				}
			}

			// Update environment variables (for current session)
			for (const { key, value } of envUpdates) {
				process.env[key] = value;
			}

			return { success: true };
		} catch (error) {
			logger.error('Error updating settings', error instanceof Error ? error : undefined);
			return fail(500, { error: 'Failed to update settings' });
		}
	},

	testBookloreConnection: async () => {
		try {
			const { testBookloreConnection } = await import('$lib/server/booklore');
			const result = await testBookloreConnection();

			if (result.success) {
				return {
					success: true,
					message: result.error || 'Booklore connection successful'
				};
			} else {
				return fail(400, { error: result.error || 'Connection failed' });
			}
		} catch (error) {
			logger.error('Error testing Booklore connection', error instanceof Error ? error : undefined);
			return fail(500, {
				error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		}
	}
};
