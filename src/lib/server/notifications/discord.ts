import { env } from '$env/dynamic/private';
import type { NotificationBackend, NotificationMessage } from './base';

/**
 * Discord webhook notification backend
 */
export class DiscordNotification implements NotificationBackend {
	private webhookUrl: string;

	constructor(webhookUrl?: string) {
		this.webhookUrl = webhookUrl || env.DISCORD_WEBHOOK_URL || '';
	}

	/**
	 * Send notification via Discord webhook
	 */
	async send(message: NotificationMessage): Promise<boolean> {
		if (!this.webhookUrl) {
			console.warn('Discord webhook URL not configured');
			return false;
		}

		try {
			const embed = {
				title: message.title,
				description: message.body,
				color: 0x5865f2, // Discord blurple
				timestamp: new Date().toISOString(),
				...(message.url && { url: message.url })
			};

			const response = await fetch(this.webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					embeds: [embed]
				})
			});

			return response.ok;
		} catch (error) {
			console.error('Error sending Discord notification:', error);
			return false;
		}
	}

	/**
	 * Test Discord webhook connection
	 */
	async test(): Promise<boolean> {
		return this.send({
			title: '✅ Test Notification',
			body: 'Discord webhook is configured correctly!'
		});
	}
}
