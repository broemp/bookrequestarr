<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { Settings, Bell, TestTube, CheckCircle, XCircle, Database, Trash2 } from 'lucide-svelte';
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
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Enter your Hardcover API key to fetch book metadata. Get one at <a
						href="https://hardcover.app/settings/api"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-foreground underline">hardcover.app/settings/api</a
					>
				</p>
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
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Enter your Discord webhook URL to receive notifications
				</p>
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
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Enter your Telegram bot token from @BotFather
				</p>
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
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					Enter the chat ID where notifications should be sent
				</p>
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
