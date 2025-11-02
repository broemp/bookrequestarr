import { env } from '$env/dynamic/private';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL = (env.LOG_LEVEL || 'info') as LogLevel;

const levels: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};

function shouldLog(level: LogLevel): boolean {
	return levels[level] >= levels[LOG_LEVEL];
}

function formatMessage(
	level: LogLevel,
	message: string,
	context?: Record<string, unknown>
): string {
	const timestamp = new Date().toISOString();
	const contextStr = context ? ` ${JSON.stringify(context)}` : '';
	return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
	debug(message: string, context?: Record<string, unknown>) {
		if (shouldLog('debug')) {
			console.log(formatMessage('debug', message, context));
		}
	},

	info(message: string, context?: Record<string, unknown>) {
		if (shouldLog('info')) {
			console.log(formatMessage('info', message, context));
		}
	},

	warn(message: string, context?: Record<string, unknown>) {
		if (shouldLog('warn')) {
			console.warn(formatMessage('warn', message, context));
		}
	},

	error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
		if (shouldLog('error')) {
			const errorContext =
				error instanceof Error
					? { ...context, error: error.message, stack: error.stack }
					: { ...context, error };
			console.error(formatMessage('error', message, errorContext));
		}
	}
};
