import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { settings, users, requests } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { getCacheStats, cleanupExpiredCache, clearAllCache } from '$lib/server/cache';
import { logger } from '$lib/server/logger';
import { env } from '$env/dynamic/private';

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
	const cacheStats = await getCacheStats();

	// Check which settings are set via environment variables
	const envOverrides = {
		hardcoverApiKey: !!env.HARDCOVER_API_KEY,
		discordWebhook: !!env.DISCORD_WEBHOOK_URL,
		telegramBotToken: !!env.TELEGRAM_BOT_TOKEN,
		telegramChatId: !!env.TELEGRAM_CHAT_ID,
		annasArchiveDomain: !!env.ANNAS_ARCHIVE_DOMAIN,
		annasArchiveApiKey: !!env.ANNAS_ARCHIVE_API_KEY,
		downloadDirectory: !!env.DOWNLOAD_DIRECTORY,
		prowlarrUrl: !!env.PROWLARR_URL,
		prowlarrApiKey: !!env.PROWLARR_API_KEY,
		sabnzbdUrl: !!env.SABNZBD_URL,
		sabnzbdApiKey: !!env.SABNZBD_API_KEY,
		sabnzbdCategory: !!env.SABNZBD_CATEGORY
	};

	return {
		settings: {
			hardcoverApiKey: settingsMap['hardcover_api_key'] || '',
			discordWebhook: settingsMap['discord_webhook_url'] || '',
			telegramBotToken: settingsMap['telegram_bot_token'] || '',
			telegramChatId: settingsMap['telegram_chat_id'] || '',
			apiCacheTtlDays: settingsMap['api_cache_ttl_days'] || '7',
			localBookCacheTtlHours: settingsMap['local_book_cache_ttl_hours'] || '6',
			annasArchiveDomain: settingsMap['annas_archive_domain'] || 'annas-archive.org',
			annasArchiveApiKey: settingsMap['annas_archive_api_key'] || '',
			downloadDirectory: settingsMap['download_directory'] || './data/downloads',
			downloadAutoMode: settingsMap['download_auto_mode'] || 'disabled',
			downloadDailyLimit: settingsMap['download_daily_limit'] || '25',
			downloadAutoSelect: settingsMap['download_auto_select'] === 'true',
			calibreBaseUrl: settingsMap['calibre_base_url'] || '',
			calibreCleanupEnabled: settingsMap['calibre_cleanup_enabled'] === 'true',
			calibreCleanupHours: settingsMap['calibre_cleanup_hours'] || '24',
			prowlarrEnabled: settingsMap['prowlarr_enabled'] === 'true',
			prowlarrUrl: settingsMap['prowlarr_url'] || '',
			prowlarrApiKey: settingsMap['prowlarr_api_key'] || '',
			minConfidenceScore: settingsMap['min_confidence_score'] || '50',
			sabnzbdUrl: settingsMap['sabnzbd_url'] || '',
			sabnzbdApiKey: settingsMap['sabnzbd_api_key'] || '',
			sabnzbdCategory: settingsMap['sabnzbd_category'] || 'books',
			downloadSourcePriority: settingsMap['download_source_priority'] || 'prowlarr_first'
		},
		envOverrides,
		stats: {
			totalUsers: totalUsers?.count || 0,
			totalRequests: totalRequests?.count || 0,
			cacheEntries: cacheStats.totalEntries,
			expiredCacheEntries: cacheStats.expiredEntries
		}
	};
};

export const actions: Actions = {
	updateSettings: async ({ request }) => {
		const formData = await request.formData();
		const hardcoverApiKey = formData.get('hardcoverApiKey') as string;
		const discordWebhook = formData.get('discordWebhook') as string;
		const telegramBotToken = formData.get('telegramBotToken') as string;
		const telegramChatId = formData.get('telegramChatId') as string;
		const apiCacheTtlDays = formData.get('apiCacheTtlDays') as string;
		const localBookCacheTtlHours = formData.get('localBookCacheTtlHours') as string;
		const annasArchiveDomain = formData.get('annasArchiveDomain') as string;
		const annasArchiveApiKey = formData.get('annasArchiveApiKey') as string;
		const downloadDirectory = formData.get('downloadDirectory') as string;
		const downloadAutoMode = formData.get('downloadAutoMode') as string;
		const downloadDailyLimit = formData.get('downloadDailyLimit') as string;
		const downloadAutoSelect = formData.get('downloadAutoSelect') === 'on';
		const calibreBaseUrl = formData.get('calibreBaseUrl') as string;
		const calibreCleanupEnabled = formData.get('calibreCleanupEnabled') === 'on';
		const calibreCleanupHours = formData.get('calibreCleanupHours') as string;
		const prowlarrEnabled = formData.get('prowlarrEnabled') === 'on';
		const prowlarrUrl = formData.get('prowlarrUrl') as string;
		const prowlarrApiKey = formData.get('prowlarrApiKey') as string;
		const minConfidenceScore = formData.get('minConfidenceScore') as string;
		const sabnzbdUrl = formData.get('sabnzbdUrl') as string;
		const sabnzbdApiKey = formData.get('sabnzbdApiKey') as string;
		const sabnzbdCategory = formData.get('sabnzbdCategory') as string;
		const downloadSourcePriority = formData.get('downloadSourcePriority') as string;

		try {
			// Update or insert settings
			const settingsToUpdate = [
				{ key: 'hardcover_api_key', value: hardcoverApiKey || '' },
				{ key: 'discord_webhook_url', value: discordWebhook || '' },
				{ key: 'telegram_bot_token', value: telegramBotToken || '' },
				{ key: 'telegram_chat_id', value: telegramChatId || '' },
				{ key: 'api_cache_ttl_days', value: apiCacheTtlDays || '7' },
				{ key: 'local_book_cache_ttl_hours', value: localBookCacheTtlHours || '6' },
				{ key: 'annas_archive_domain', value: annasArchiveDomain || 'annas-archive.org' },
				{ key: 'annas_archive_api_key', value: annasArchiveApiKey || '' },
				{ key: 'download_directory', value: downloadDirectory || './data/downloads' },
				{ key: 'download_auto_mode', value: downloadAutoMode || 'disabled' },
				{ key: 'download_daily_limit', value: downloadDailyLimit || '25' },
				{ key: 'download_auto_select', value: downloadAutoSelect ? 'true' : 'false' },
				{ key: 'calibre_base_url', value: calibreBaseUrl || '' },
				{ key: 'calibre_cleanup_enabled', value: calibreCleanupEnabled ? 'true' : 'false' },
				{ key: 'calibre_cleanup_hours', value: calibreCleanupHours || '24' },
				{ key: 'prowlarr_enabled', value: prowlarrEnabled ? 'true' : 'false' },
				{ key: 'prowlarr_url', value: prowlarrUrl || '' },
				{ key: 'prowlarr_api_key', value: prowlarrApiKey || '' },
				{ key: 'min_confidence_score', value: minConfidenceScore || '50' },
				{ key: 'sabnzbd_url', value: sabnzbdUrl || '' },
				{ key: 'sabnzbd_api_key', value: sabnzbdApiKey || '' },
				{ key: 'sabnzbd_category', value: sabnzbdCategory || 'books' },
				{ key: 'download_source_priority', value: downloadSourcePriority || 'prowlarr_first' }
			];

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
			if (hardcoverApiKey) process.env.HARDCOVER_API_KEY = hardcoverApiKey;
			if (discordWebhook) process.env.DISCORD_WEBHOOK_URL = discordWebhook;
			if (telegramBotToken) process.env.TELEGRAM_BOT_TOKEN = telegramBotToken;
			if (telegramChatId) process.env.TELEGRAM_CHAT_ID = telegramChatId;
			if (annasArchiveDomain) process.env.ANNAS_ARCHIVE_DOMAIN = annasArchiveDomain;
			if (annasArchiveApiKey) process.env.ANNAS_ARCHIVE_API_KEY = annasArchiveApiKey;
			if (prowlarrUrl) process.env.PROWLARR_URL = prowlarrUrl;
			if (prowlarrApiKey) process.env.PROWLARR_API_KEY = prowlarrApiKey;
			if (sabnzbdUrl) process.env.SABNZBD_URL = sabnzbdUrl;
			if (sabnzbdApiKey) process.env.SABNZBD_API_KEY = sabnzbdApiKey;
			if (sabnzbdCategory) process.env.SABNZBD_CATEGORY = sabnzbdCategory;

			return { success: true };
		} catch (error) {
			logger.error('Error updating settings', error instanceof Error ? error : undefined);
			return fail(500, { error: 'Failed to update settings' });
		}
	},

	cleanupCache: async () => {
		try {
			const deletedCount = await cleanupExpiredCache();
			return { success: true, message: `Cleaned up ${deletedCount} expired cache entries` };
		} catch (error) {
			logger.error('Error cleaning up cache', error instanceof Error ? error : undefined);
			return fail(500, { error: 'Failed to cleanup cache' });
		}
	},

	clearCache: async () => {
		try {
			await clearAllCache();
			return { success: true, message: 'All cache entries cleared' };
		} catch (error) {
			logger.error('Error clearing cache', error instanceof Error ? error : undefined);
			return fail(500, { error: 'Failed to clear cache' });
		}
	}
};
