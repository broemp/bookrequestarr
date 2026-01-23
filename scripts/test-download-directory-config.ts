/**
 * Test script for download directory configuration
 * 
 * This script tests the priority order of download directory configuration:
 * 1. Environment variable (DOWNLOAD_DIRECTORY)
 * 2. Database setting (download_directory)
 * 3. Default value (./data/downloads)
 * 
 * Run with: npx tsx scripts/test-download-directory-config.ts
 */

import { db } from '../src/lib/server/db';
import { settings } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSetting, initializeSettings } from '../src/lib/server/settingsInit';

async function testDownloadDirectoryConfig() {
	console.log('=== Testing Download Directory Configuration ===\n');

	// Test 1: Check if settings initialization works
	console.log('Test 1: Initialize settings from environment variables');
	try {
		await initializeSettings();
		console.log('✓ Settings initialized successfully\n');
	} catch (error) {
		console.error('✗ Failed to initialize settings:', error);
		process.exit(1);
	}

	// Test 2: Check database setting
	console.log('Test 2: Check database setting');
	try {
		const [dbSetting] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_directory'))
			.limit(1);

		if (dbSetting) {
			console.log(`✓ Database setting found: ${dbSetting.value}`);
		} else {
			console.log('✓ No database setting found (will use env or default)');
		}
		console.log();
	} catch (error) {
		console.error('✗ Failed to check database setting:', error);
		process.exit(1);
	}

	// Test 3: Check environment variable
	console.log('Test 3: Check environment variable');
	const envValue = process.env.DOWNLOAD_DIRECTORY;
	if (envValue) {
		console.log(`✓ Environment variable set: ${envValue}`);
	} else {
		console.log('✓ Environment variable not set');
	}
	console.log();

	// Test 4: Test getSetting with fallback chain
	console.log('Test 4: Test getSetting with fallback chain');
	try {
		const directory = await getSetting('download_directory', 'DOWNLOAD_DIRECTORY', './data/downloads');
		console.log(`✓ getSetting returned: ${directory}`);
		
		// Verify the priority order
		if (envValue) {
			if (directory === envValue) {
				console.log('✓ Correctly using environment variable (highest priority)');
			} else {
				console.error('✗ Expected environment variable value, got:', directory);
				process.exit(1);
			}
		} else {
			const [dbSetting] = await db
				.select()
				.from(settings)
				.where(eq(settings.key, 'download_directory'))
				.limit(1);
			
			if (dbSetting && directory === dbSetting.value) {
				console.log('✓ Correctly using database setting (second priority)');
			} else if (!dbSetting && directory === './data/downloads') {
				console.log('✓ Correctly using default value (lowest priority)');
			} else {
				console.error('✗ Unexpected value returned:', directory);
				process.exit(1);
			}
		}
		console.log();
	} catch (error) {
		console.error('✗ Failed to get setting:', error);
		process.exit(1);
	}

	// Test 5: Test setting a custom value in database
	console.log('Test 5: Test setting a custom value in database');
	const testValue = '/tmp/test-downloads';
	try {
		// Check if setting exists
		const [existing] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_directory'))
			.limit(1);

		if (existing) {
			// Update existing setting
			await db
				.update(settings)
				.set({ value: testValue })
				.where(eq(settings.key, 'download_directory'));
			console.log(`✓ Updated database setting to: ${testValue}`);
		} else {
			// Insert new setting
			await db.insert(settings).values({
				key: 'download_directory',
				value: testValue
			});
			console.log(`✓ Inserted database setting: ${testValue}`);
		}

		// Verify it was saved
		const [updated] = await db
			.select()
			.from(settings)
			.where(eq(settings.key, 'download_directory'))
			.limit(1);

		if (updated && updated.value === testValue) {
			console.log('✓ Database setting saved correctly');
		} else {
			console.error('✗ Failed to save database setting');
			process.exit(1);
		}
		console.log();
	} catch (error) {
		console.error('✗ Failed to set database value:', error);
		process.exit(1);
	}

	// Test 6: Verify priority order with database setting
	console.log('Test 6: Verify priority order with database setting');
	try {
		const directory = await getSetting('download_directory', 'DOWNLOAD_DIRECTORY', './data/downloads');
		
		if (envValue) {
			// Environment variable should still take precedence
			if (directory === envValue) {
				console.log('✓ Environment variable correctly overrides database setting');
			} else {
				console.error('✗ Environment variable should override database setting');
				console.error(`  Expected: ${envValue}, Got: ${directory}`);
				process.exit(1);
			}
		} else {
			// Database setting should be used
			if (directory === testValue) {
				console.log('✓ Database setting correctly used when no environment variable');
			} else {
				console.error('✗ Database setting should be used');
				console.error(`  Expected: ${testValue}, Got: ${directory}`);
				process.exit(1);
			}
		}
		console.log();
	} catch (error) {
		console.error('✗ Failed to verify priority order:', error);
		process.exit(1);
	}

	console.log('=== All tests passed! ===\n');
	console.log('Configuration priority order:');
	console.log('1. Environment variable (DOWNLOAD_DIRECTORY):', envValue || 'not set');
	console.log('2. Database setting (download_directory):', testValue);
	console.log('3. Default value: ./data/downloads');
	console.log();
	console.log('Current effective value:', await getSetting('download_directory', 'DOWNLOAD_DIRECTORY', './data/downloads'));
}

// Run the tests
testDownloadDirectoryConfig()
	.then(() => {
		console.log('\n✓ Test completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n✗ Test failed:', error);
		process.exit(1);
	});
