<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import {
		Settings,
		Bell,
		TestTube,
		CheckCircle,
		XCircle,
		Database,
		Trash2,
		Download
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();

	let testResults = $state<{ backend: string; success: boolean }[]>([]);
	let isTesting = $state(false);

	async function testNotifications() {
		isTesting = true;
		testResults = [];

		try {
			const response = await fetch('/api/notifications/test', { method: 'POST' });
			if (response.ok) {
				testResults = await response.json();
			}
		} catch (error) {
			console.error('Error testing notifications:', error);
		} finally {
			isTesting = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Settings - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Configure application settings and notifications</p>
	</div>

	<!-- API Settings -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<Settings class="h-6 w-6" />
			<h2 class="text-xl font-semibold">API Settings</h2>
		</div>

		<form method="POST" action="?/updateSettings" use:enhance class="space-y-4">
			<div>
				<label for="hardcoverApiKey" class="mb-2 block text-sm font-medium">
					Hardcover API Key
				</label>
				<Input
					id="hardcoverApiKey"
					name="hardcoverApiKey"
					type="text"
					placeholder="your-hardcover-api-key"
					value={data.settings.hardcoverApiKey || ''}
					disabled={data.envOverrides.hardcoverApiKey}
				/>
				{#if data.envOverrides.hardcoverApiKey}
					<p class="mt-1 text-xs text-blue-500">
						✓ This value is set via environment variable and cannot be changed here
					</p>
				{:else}
					<p class="text-muted-foreground mt-1 text-xs">
						Enter your Hardcover API key to fetch book metadata. Get one at <a
							href="https://hardcover.app/settings/api"
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-foreground underline">hardcover.app/settings/api</a
						>
					</p>
				{/if}
			</div>

			<div>
				<label for="apiCacheTtlDays" class="mb-2 block text-sm font-medium">
					API Cache TTL (Days)
				</label>
				<Input
					id="apiCacheTtlDays"
					name="apiCacheTtlDays"
					type="number"
					min="1"
					max="365"
					placeholder="7"
					value={data.settings.apiCacheTtlDays || '7'}
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					How long to cache API responses before refetching (default: 7 days)
				</p>
			</div>

			<div class="flex gap-3">
				<Button type="submit">Save Settings</Button>
			</div>

			{#if form?.success}
				<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
					Settings saved successfully!
				</div>
			{/if}

			{#if form?.error}
				<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
					{form.error}
				</div>
			{/if}
		</form>
	</Card>

	<!-- Anna's Archive Integration -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<Download class="h-6 w-6" />
			<h2 class="text-xl font-semibold">Anna's Archive Integration</h2>
		</div>

		{#if !data.settings.annasArchiveApiKey}
			<div class="mb-4 rounded-md bg-blue-500/10 p-4 text-sm text-blue-500">
				<p class="font-medium">Anna's Archive API Key Required</p>
				<p class="mt-1">
					To enable automatic book downloads, you need to configure an Anna's Archive API key.
					Please consider <a
						href="https://annas-archive.org/donate"
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:text-blue-400">supporting Anna's Archive</a
					> to get access to fast downloads.
				</p>
			</div>
		{/if}

		<form method="POST" action="?/updateSettings" use:enhance class="space-y-4">
			<div>
				<label for="annasArchiveDomain" class="mb-2 block text-sm font-medium">
					Anna's Archive Domain
				</label>
				<Input
					id="annasArchiveDomain"
					name="annasArchiveDomain"
					type="text"
					placeholder="annas-archive.org"
					value={data.settings.annasArchiveDomain || 'annas-archive.org'}
					disabled={data.envOverrides.annasArchiveDomain}
				/>
				{#if data.envOverrides.annasArchiveDomain}
					<p class="mt-1 text-xs text-blue-500">
						✓ This value is set via environment variable and cannot be changed here
					</p>
				{:else}
					<p class="text-muted-foreground mt-1 text-xs">
						Base domain for Anna's Archive (e.g., annas-archive.org, annas-archive.se)
					</p>
				{/if}
			</div>

			<div>
				<label for="annasArchiveApiKey" class="mb-2 block text-sm font-medium">
					Anna's Archive API Key
				</label>
				<Input
					id="annasArchiveApiKey"
					name="annasArchiveApiKey"
					type="text"
					placeholder="your-annas-archive-api-key"
					value={data.settings.annasArchiveApiKey || ''}
					disabled={data.envOverrides.annasArchiveApiKey}
				/>
				{#if data.envOverrides.annasArchiveApiKey}
					<p class="mt-1 text-xs text-blue-500">
						✓ This value is set via environment variable and cannot be changed here
					</p>
				{:else}
					<p class="text-muted-foreground mt-1 text-xs">
						Enter your Anna's Archive API key for fast downloads
					</p>
				{/if}
			</div>

			<div>
				<label for="downloadDirectory" class="mb-2 block text-sm font-medium">
					Download Directory
				</label>
				<Input
					id="downloadDirectory"
					name="downloadDirectory"
					type="text"
					placeholder="./data/downloads"
					value={data.settings.downloadDirectory || './data/downloads'}
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Path where downloaded books will be stored (e.g., Calibre ingest folder)
				</p>
			</div>

			<div>
				<label for="downloadAutoMode" class="mb-2 block text-sm font-medium">
					Auto-Download Mode
				</label>
				<select
					id="downloadAutoMode"
					name="downloadAutoMode"
					value={data.settings.downloadAutoMode || 'disabled'}
					class="border-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					style="background-color: hsl(var(--input));"
				>
					<option value="disabled">Disabled (Manual only)</option>
					<option value="all_users">All Users</option>
					<option value="selected_users">Selected Users Only</option>
				</select>
				<p class="text-muted-foreground mt-1 text-xs">
					Control which users' requests trigger automatic downloads
				</p>
			</div>

			<div>
				<label for="downloadDailyLimit" class="mb-2 block text-sm font-medium">
					Daily Download Limit
				</label>
				<Input
					id="downloadDailyLimit"
					name="downloadDailyLimit"
					type="number"
					min="1"
					max="1000"
					placeholder="25"
					value={data.settings.downloadDailyLimit || '25'}
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Maximum number of downloads per day (default: 25)
				</p>
			</div>

			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					id="downloadAutoSelect"
					name="downloadAutoSelect"
					checked={data.settings.downloadAutoSelect}
					class="h-4 w-4 rounded border-gray-300"
				/>
				<label for="downloadAutoSelect" class="text-sm font-medium"> Auto-Select Best File </label>
				<p class="text-muted-foreground text-xs">
					(Automatically choose the best file format, or prompt for manual selection)
				</p>
			</div>

			<div>
				<label for="calibreBaseUrl" class="mb-2 block text-sm font-medium">
					Calibre Base URL (Optional)
				</label>
				<Input
					id="calibreBaseUrl"
					name="calibreBaseUrl"
					type="url"
					placeholder="https://calibre.example.com"
					value={data.settings.calibreBaseUrl || ''}
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Base URL for Calibre-Web interface to link downloaded books
				</p>
			</div>

			{#if data.settings.calibreBaseUrl}
				<div class="space-y-4 rounded-md bg-blue-500/10 p-4">
					<h3 class="text-sm font-semibold text-blue-600">Calibre-Web Automated Integration</h3>

					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="calibreCleanupEnabled"
							name="calibreCleanupEnabled"
							checked={data.settings.calibreCleanupEnabled}
							class="h-4 w-4 rounded border-gray-300"
						/>
						<label for="calibreCleanupEnabled" class="text-sm font-medium">
							Enable automatic cleanup of ingested files
						</label>
					</div>

					{#if data.settings.calibreCleanupEnabled}
						<div>
							<label for="calibreCleanupHours" class="mb-2 block text-sm font-medium">
								Cleanup files older than (hours)
							</label>
							<Input
								id="calibreCleanupHours"
								name="calibreCleanupHours"
								type="number"
								min="1"
								max="168"
								placeholder="24"
								value={data.settings.calibreCleanupHours || '24'}
							/>
							<p class="text-muted-foreground mt-1 text-xs">
								Files in the download directory will be automatically removed after this many hours,
								assuming Calibre-Web has imported them
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<div class="flex gap-3">
				<Button type="submit">Save Settings</Button>
			</div>

			{#if form?.success}
				<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
					Settings saved successfully!
				</div>
			{/if}

			{#if form?.error}
				<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
					{form.error}
				</div>
			{/if}
		</form>
	</Card>

	<!-- Cache Management -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<Database class="h-6 w-6" />
			<h2 class="text-xl font-semibold">API Cache Management</h2>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Total Cache Entries</p>
					<p class="text-muted-foreground text-sm">API responses stored in cache</p>
				</div>
				<Badge variant="secondary">{data.stats.cacheEntries}</Badge>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Expired Entries</p>
					<p class="text-muted-foreground text-sm">Cache entries past their TTL</p>
				</div>
				<Badge variant={data.stats.expiredCacheEntries > 0 ? 'destructive' : 'secondary'}>
					{data.stats.expiredCacheEntries}
				</Badge>
			</div>

			<div class="flex gap-3 pt-4">
				<form method="POST" action="?/cleanupCache" use:enhance>
					<Button type="submit" variant="outline">
						<Trash2 class="mr-2 h-4 w-4" />
						Cleanup Expired
					</Button>
				</form>

				<form method="POST" action="?/clearCache" use:enhance>
					<Button type="submit" variant="destructive">
						<Trash2 class="mr-2 h-4 w-4" />
						Clear All Cache
					</Button>
				</form>
			</div>

			{#if form?.message}
				<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
					{form.message}
				</div>
			{/if}
		</div>
	</Card>

	<!-- Notification Settings -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<Bell class="h-6 w-6" />
			<h2 class="text-xl font-semibold">Notification Settings</h2>
		</div>

		<form method="POST" action="?/updateSettings" use:enhance class="space-y-4">
			<div>
				<label for="discordWebhook" class="mb-2 block text-sm font-medium">
					Discord Webhook URL
				</label>
				<Input
					id="discordWebhook"
					name="discordWebhook"
					type="url"
					placeholder="https://discord.com/api/webhooks/..."
					value={data.settings.discordWebhook || ''}
					disabled={data.envOverrides.discordWebhook}
				/>
				{#if data.envOverrides.discordWebhook}
					<p class="mt-1 text-xs text-blue-500">
						✓ This value is set via environment variable and cannot be changed here
					</p>
				{:else}
					<p class="text-muted-foreground mt-1 text-xs">
						Enter your Discord webhook URL to receive notifications
					</p>
				{/if}
			</div>

			<div>
				<label for="telegramBotToken" class="mb-2 block text-sm font-medium">
					Telegram Bot Token
				</label>
				<Input
					id="telegramBotToken"
					name="telegramBotToken"
					type="text"
					placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
					value={data.settings.telegramBotToken || ''}
					disabled={data.envOverrides.telegramBotToken}
				/>
				{#if data.envOverrides.telegramBotToken}
					<p class="mt-1 text-xs text-blue-500">
						✓ This value is set via environment variable and cannot be changed here
					</p>
				{:else}
					<p class="text-muted-foreground mt-1 text-xs">
						Enter your Telegram bot token from @BotFather
					</p>
				{/if}
			</div>

			<div>
				<label for="telegramChatId" class="mb-2 block text-sm font-medium">
					Telegram Chat ID
				</label>
				<Input
					id="telegramChatId"
					name="telegramChatId"
					type="text"
					placeholder="-1001234567890"
					value={data.settings.telegramChatId || ''}
					disabled={data.envOverrides.telegramChatId}
				/>
				{#if data.envOverrides.telegramChatId}
					<p class="mt-1 text-xs text-blue-500">
						✓ This value is set via environment variable and cannot be changed here
					</p>
				{:else}
					<p class="text-muted-foreground mt-1 text-xs">
						Enter the chat ID where notifications should be sent
					</p>
				{/if}
			</div>

			<div class="flex gap-3">
				<Button type="submit">Save Settings</Button>
				<Button type="button" variant="outline" onclick={testNotifications} disabled={isTesting}>
					<TestTube class="mr-2 h-4 w-4" />
					{isTesting ? 'Testing...' : 'Test Notifications'}
				</Button>
			</div>

			{#if form?.success}
				<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
					Settings saved successfully!
				</div>
			{/if}

			{#if form?.error}
				<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
					{form.error}
				</div>
			{/if}
		</form>

		<!-- Test results -->
		{#if testResults.length > 0}
			<div class="mt-6 space-y-2">
				<h3 class="font-medium">Test Results:</h3>
				{#each testResults as result}
					<div class="flex items-center gap-2">
						{#if result.success}
							<CheckCircle class="h-5 w-5 text-green-500" />
							<span class="text-sm">
								{result.backend}: <span class="text-green-500">Success</span>
							</span>
						{:else}
							<XCircle class="text-destructive h-5 w-5" />
							<span class="text-sm">
								{result.backend}: <span class="text-destructive">Failed</span>
							</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card>

	<!-- General Settings -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<Settings class="h-6 w-6" />
			<h2 class="text-xl font-semibold">General Settings</h2>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Application Version</p>
					<p class="text-muted-foreground text-sm">Current version of Bookrequestarr</p>
				</div>
				<Badge>v0.0.1</Badge>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Database</p>
					<p class="text-muted-foreground text-sm">SQLite with Drizzle ORM</p>
				</div>
				<Badge variant="secondary">Active</Badge>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Total Users</p>
					<p class="text-muted-foreground text-sm">Registered user accounts</p>
				</div>
				<Badge variant="secondary">{data.stats.totalUsers}</Badge>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Total Requests</p>
					<p class="text-muted-foreground text-sm">All book requests</p>
				</div>
				<Badge variant="secondary">{data.stats.totalRequests}</Badge>
			</div>
		</div>
	</Card>
</div>
