import { env } from '$env/dynamic/private';
import { db } from '../db';
import { notifications } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { NotificationMessage, NotificationType } from './base';
import { DiscordNotification } from './discord';
import { TelegramNotification } from './telegram';

/**
 * Get all configured notification backends
 */
function getNotificationBackends() {
	const backends = [];

	if (env.DISCORD_WEBHOOK_URL) {
		backends.push(new DiscordNotification());
	}

	if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
		backends.push(new TelegramNotification());
	}

	return backends;
}

/**
 * Send notification to all configured backends
 */
export async function sendNotification(
	type: NotificationType,
	message: NotificationMessage
): Promise<void> {
	const backends = getNotificationBackends();

	if (backends.length === 0) {
		console.warn('No notification backends configured');
		return;
	}

	// Store notification in database
	const [notification] = await db
		.insert(notifications)
		.values({
			type,
			payload: JSON.stringify(message),
			status: 'pending'
		})
		.returning();

	// Send to all backends
	const results = await Promise.allSettled(backends.map((backend) => backend.send(message)));

	// Check if any succeeded
	const anySucceeded = results.some((result) => result.status === 'fulfilled' && result.value);

	// Update notification status
	await db
		.update(notifications)
		.set({
			status: anySucceeded ? 'sent' : 'failed',
			sentAt: anySucceeded ? new Date() : null
		})
		.where(eq(notifications.id, notification.id));
}

/**
 * Test all configured notification backends
 */
export async function testNotifications(): Promise<{ backend: string; success: boolean }[]> {
	const results: { backend: string; success: boolean }[] = [];

	if (env.DISCORD_WEBHOOK_URL) {
		const discord = new DiscordNotification();
		const success = await discord.test();
		results.push({ backend: 'Discord', success });
	}

	if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
		const telegram = new TelegramNotification();
		const success = await telegram.test();
		results.push({ backend: 'Telegram', success });
	}

	return results;
}

/**
 * Format notification for new book request
 */
export function formatRequestNotification(request: {
	userName: string;
	bookTitle: string;
	bookAuthor?: string;
	language?: string;
	specialNotes?: string;
	formatType?: string;
}): NotificationMessage {
	let body = `User: ${request.userName}\nBook: ${request.bookTitle}`;

	if (request.bookAuthor) {
		body += `\nAuthor: ${request.bookAuthor}`;
	}

	if (request.formatType) {
		body += `\nFormat: ${request.formatType.charAt(0).toUpperCase() + request.formatType.slice(1)}`;
	}

	if (request.language) {
		body += `\nLanguage: ${request.language}`;
	}

	if (request.specialNotes) {
		body += `\n\nNotes: ${request.specialNotes}`;
	}

	return {
		title: '📚 New Book Request',
		body
	};
}

/**
 * Format notification for request status update
 */
export function formatRequestUpdateNotification(request: {
	bookTitle: string;
	status: string;
}): NotificationMessage {
	const statusEmoji =
		{
			approved: '✅',
			rejected: '❌',
			completed: '🎉'
		}[request.status] || '📝';

	return {
		title: `${statusEmoji} Request ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`,
		body: `Your request for "${request.bookTitle}" has been ${request.status}.`
	};
}
