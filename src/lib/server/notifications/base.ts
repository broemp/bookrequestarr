/**
 * Base interface for notification backends
 */
export interface NotificationBackend {
	/**
	 * Send a notification
	 */
	send(message: NotificationMessage): Promise<boolean>;

	/**
	 * Test the notification backend
	 */
	test(): Promise<boolean>;
}

/**
 * Notification message structure
 */
export interface NotificationMessage {
	title: string;
	body: string;
	url?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Notification types
 */
export type NotificationType = 'request_created' | 'request_updated' | 'new_release';
