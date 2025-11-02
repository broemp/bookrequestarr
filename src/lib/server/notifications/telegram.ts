import { env } from '$env/dynamic/private';
import type { NotificationBackend, NotificationMessage } from './base';

/**
 * Telegram bot notification backend
 */
export class TelegramNotification implements NotificationBackend {
	private botToken: string;
	private chatId: string;

	constructor(botToken?: string, chatId?: string) {
		this.botToken = botToken || env.TELEGRAM_BOT_TOKEN || '';
		this.chatId = chatId || env.TELEGRAM_CHAT_ID || '';
	}

	/**
	 * Send notification via Telegram bot
	 */
	async send(message: NotificationMessage): Promise<boolean> {
		if (!this.botToken || !this.chatId) {
			console.warn('Telegram bot token or chat ID not configured');
			return false;
		}

		try {
			const text = `<b>${this.escapeHtml(message.title)}</b>\n\n${this.escapeHtml(message.body)}`;

			const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					chat_id: this.chatId,
					text,
					parse_mode: 'HTML',
					disable_web_page_preview: false
				})
			});

			const result = await response.json();
			return result.ok;
		} catch (error) {
			console.error('Error sending Telegram notification:', error);
			return false;
		}
	}

	/**
	 * Test Telegram bot connection
	 */
	async test(): Promise<boolean> {
		return this.send({
			title: '✅ Test Notification',
			body: 'Telegram bot is configured correctly!'
		});
	}

	/**
	 * Escape HTML special characters
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}
