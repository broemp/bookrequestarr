import { env } from '$env/dynamic/private';
import { logger } from './logger';

interface EnvVar {
	name: string;
	required: boolean;
	description: string;
	validate?: (value: string) => boolean;
	validationError?: string; // Specific error message when validation fails
	default?: string;
}

const ENV_VARS: EnvVar[] = [
	// Database
	{
		name: 'DATABASE_URL',
		required: true,
		description: 'SQLite database file path'
	},

	// OIDC Authentication (not required if DISABLE_AUTH is true)
	{
		name: 'OIDC_ISSUER',
		required: false, // Checked conditionally
		description: 'OIDC provider issuer URL',
		validate: (value) => value.startsWith('http://') || value.startsWith('https://'),
		validationError: 'Must start with http:// or https://'
	},
	{
		name: 'OIDC_CLIENT_ID',
		required: false, // Checked conditionally
		description: 'OIDC client ID'
	},
	{
		name: 'OIDC_CLIENT_SECRET',
		required: false, // Checked conditionally
		description: 'OIDC client secret',
		validate: (value) => value.length >= 16,
		validationError: 'Must be at least 16 characters long'
	},
	{
		name: 'OIDC_REDIRECT_URI',
		required: false, // Checked conditionally
		description: 'OIDC callback URL',
		validate: (value) => value.startsWith('http://') || value.startsWith('https://'),
		validationError: 'Must start with http:// or https://'
	},

	// Security
	{
		name: 'JWT_SECRET',
		required: false, // Checked conditionally
		description: 'JWT token signing secret',
		validate: (value) => value.length >= 32,
		validationError: 'Must be at least 32 characters long'
	},

	// Hardcover API
	{
		name: 'HARDCOVER_API_KEY',
		required: true,
		description: 'Hardcover API key for fetching book metadata'
	},

	// Application
	{
		name: 'PUBLIC_APP_URL',
		required: false,
		description: 'Public application URL',
		default: 'http://localhost:3000',
		validate: (value) => value.startsWith('http://') || value.startsWith('https://'),
		validationError: 'Must start with http:// or https://'
	},

	// Optional
	{
		name: 'DISABLE_AUTH',
		required: false,
		description: 'Disable authentication for development (NEVER use in production!)',
		validate: (value) => value === 'true' || value === 'false',
		validationError: 'Must be either "true" or "false"'
	},
	{
		name: 'NODE_ENV',
		required: false,
		description: 'Node environment',
		default: 'development'
	},
	{
		name: 'LOG_LEVEL',
		required: false,
		description: 'Logging level (debug, info, warn, error)',
		default: 'info',
		validate: (value) => ['debug', 'info', 'warn', 'error'].includes(value),
		validationError: 'Must be one of: debug, info, warn, error'
	},
	{
		name: 'API_CACHE_TTL_DAYS',
		required: false,
		description: 'API cache TTL in days',
		default: '7',
		validate: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
		validationError: 'Must be a positive integer'
	},

	// Anna's Archive Integration (optional)
	{
		name: 'ANNAS_ARCHIVE_API_KEY',
		required: false,
		description: "Anna's Archive API key for fast downloads"
	},
	{
		name: 'DOWNLOAD_DIRECTORY',
		required: false,
		description: 'Directory for downloaded books',
		default: './data/downloads'
	},
	{
		name: 'DOWNLOAD_TEMP_DIRECTORY',
		required: false,
		description: 'Temporary directory for in-progress downloads',
		default: './data/downloads-temp'
	},
	{
		name: 'DOWNLOAD_DAILY_LIMIT',
		required: false,
		description: 'Maximum downloads per day',
		default: '25',
		validate: (value) => !isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0,
		validationError: 'Must be a positive integer'
	}
];

interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Validate all required environment variables
 * @returns Validation result with errors and warnings
 */
export function validateEnv(): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const disableAuth = env.DISABLE_AUTH === 'true';
	const nodeEnv = env.NODE_ENV || 'development';

	// Check each environment variable
	for (const envVar of ENV_VARS) {
		const value = env[envVar.name];

		// Check if required variable is missing
		let isRequired = envVar.required;

		// OIDC and JWT_SECRET are only required if auth is enabled
		if (
			[
				'OIDC_ISSUER',
				'OIDC_CLIENT_ID',
				'OIDC_CLIENT_SECRET',
				'OIDC_REDIRECT_URI',
				'JWT_SECRET'
			].includes(envVar.name)
		) {
			isRequired = !disableAuth;
		}

		if (isRequired && !value) {
			errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description}`);
			continue;
		}

		// If variable has a default and is missing, that's okay
		if (!value && envVar.default) {
			continue;
		}

		// Validate the value if present and validator exists
		if (value && envVar.validate) {
			if (!envVar.validate(value)) {
				// Mask sensitive values in error messages
				const isSensitive =
					envVar.name.includes('SECRET') ||
					envVar.name.includes('KEY') ||
					envVar.name.includes('TOKEN');
				const displayValue = isSensitive
					? `***${value.slice(-4)}` // Show only last 4 characters for secrets
					: `"${value}"`;

				const errorMsg = envVar.validationError
					? `Invalid value for ${envVar.name}: ${displayValue}. ${envVar.validationError}`
					: `Invalid value for ${envVar.name}: ${displayValue}. ${envVar.description}`;

				errors.push(errorMsg);
			}
		}
	}

	// Production-specific checks
	if (nodeEnv === 'production') {
		if (disableAuth) {
			errors.push(
				'DISABLE_AUTH=true is NOT allowed in production! This is a severe security risk.'
			);
		}

		const publicAppUrl = env.PUBLIC_APP_URL as string | undefined;
		if (publicAppUrl && publicAppUrl.startsWith('http://') && !publicAppUrl.includes('localhost')) {
			warnings.push(
				'PUBLIC_APP_URL uses HTTP in production. HTTPS is strongly recommended for security.'
			);
		}

		if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
			warnings.push('JWT_SECRET should be at least 64 characters long for production use.');
		}
	}

	// Development-specific warnings
	if (nodeEnv === 'development' && disableAuth) {
		warnings.push(
			'Authentication is disabled (DISABLE_AUTH=true). This should NEVER be used in production!'
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validate environment variables and exit if critical errors are found
 * Call this at application startup
 */
export function validateEnvOrExit(): void {
	logger.info('Validating environment variables...');

	const result = validateEnv();

	// Log warnings
	if (result.warnings.length > 0) {
		for (const warning of result.warnings) {
			logger.warn(warning);
		}
	}

	// Log errors and exit if invalid
	if (!result.valid) {
		logger.error('Environment validation failed!');
		for (const error of result.errors) {
			logger.error(error);
		}
		logger.error('Please fix the above errors and restart the application.');
		process.exit(1);
	}

	logger.info('Environment validation passed');
}

/**
 * Get a summary of configured environment variables (without exposing secrets)
 */
export function getEnvSummary(): Record<string, string> {
	const summary: Record<string, string> = {};

	for (const envVar of ENV_VARS) {
		const value = env[envVar.name];

		if (!value) {
			summary[envVar.name] = envVar.default ? `(default: ${envVar.default})` : '(not set)';
		} else if (
			envVar.name.includes('SECRET') ||
			envVar.name.includes('KEY') ||
			envVar.name.includes('TOKEN')
		) {
			// Mask secrets
			summary[envVar.name] = '***REDACTED***';
		} else {
			summary[envVar.name] = value;
		}
	}

	return summary;
}
