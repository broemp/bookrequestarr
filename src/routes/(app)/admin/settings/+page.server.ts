import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { settings, users, requests } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { getCacheStats, cleanupExpiredCache, clearAllCache } from '$lib/server/cache';

export const load: PageServerLoad = async () => {
	// Get all settings
	const allSettings = await db.select().from(settings);

	const settingsMap: Record<string, string> = {};
	for (const setting of allSettings) {
		settingsMap[setting.key] = setting.value;
	}

	// Get stats
	const [totalUsers] = await db.select({ count: users.id }).from(users);
	const [totalRequests] = await db.select({ count: requests.id }).from(requests);
	const cacheStats = await getCacheStats();

	return {
		settings: {
			hardcoverApiKey: settingsMap['hardcover_api_key'] || '',
			discordWebhook: settingsMap['discord_webhook_url'] || '',
			telegramBotToken: settingsMap['telegram_bot_token'] || '',
			telegramChatId: settingsMap['telegram_chat_id'] || '',
			apiCacheTtlDays: settingsMap['api_cache_ttl_days'] || '7'
		},
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

		try {
			// Update or insert settings
			const settingsToUpdate = [
				{ key: 'hardcover_api_key', value: hardcoverApiKey || '' },
				{ key: 'discord_webhook_url', value: discordWebhook || '' },
				{ key: 'telegram_bot_token', value: telegramBotToken || '' },
				{ key: 'telegram_chat_id', value: telegramChatId || '' },
				{ key: 'api_cache_ttl_days', value: apiCacheTtlDays || '7' }
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

			return { success: true };
		} catch (error) {
			console.error('Error updating settings:', error);
			return fail(500, { error: 'Failed to update settings' });
		}
	},

	cleanupCache: async () => {
		try {
			const deletedCount = await cleanupExpiredCache();
			return { success: true, message: `Cleaned up ${deletedCount} expired cache entries` };
		} catch (error) {
			console.error('Error cleaning up cache:', error);
			return fail(500, { error: 'Failed to cleanup cache' });
		}
	},

	clearCache: async () => {
		try {
			await clearAllCache();
			return { success: true, message: 'All cache entries cleared' };
		} catch (error) {
			console.error('Error clearing cache:', error);
			return fail(500, { error: 'Failed to clear cache' });
		}
	}
};
