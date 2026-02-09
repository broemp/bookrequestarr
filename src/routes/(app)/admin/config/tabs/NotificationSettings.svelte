<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { Bell, TestTube, CheckCircle, XCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface Props {
		settings: {
			discordWebhook: string;
			telegramBotToken: string;
			telegramChatId: string;
		};
		envOverrides: {
			discordWebhook: boolean;
			telegramBotToken: boolean;
			telegramChatId: boolean;
		};
		form: { success?: boolean; error?: string } | null;
	}

	let { settings, envOverrides, form }: Props = $props();

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

<Card class="p-6">
	<div class="mb-4 flex items-center gap-3">
		<Bell class="h-6 w-6" />
		<h2 class="text-xl font-semibold">Notification Settings</h2>
	</div>

	<form
		method="POST"
		action="?/updateSettings"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
		class="space-y-4"
	>
		<div>
			<label for="discordWebhook" class="mb-2 block text-sm font-medium">
				Discord Webhook URL
			</label>
			<Input
				id="discordWebhook"
				name="discordWebhook"
				type="text"
				placeholder="https://discord.com/api/webhooks/..."
				value={settings.discordWebhook || ''}
				disabled={envOverrides.discordWebhook}
			/>
			{#if envOverrides.discordWebhook}
				<p class="mt-1 text-xs text-blue-500">
					✓ This value is set via environment variable and cannot be changed here
				</p>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">
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
				value={settings.telegramBotToken || ''}
				disabled={envOverrides.telegramBotToken}
			/>
			{#if envOverrides.telegramBotToken}
				<p class="mt-1 text-xs text-blue-500">
					✓ This value is set via environment variable and cannot be changed here
				</p>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">
					Enter your Telegram bot token from @BotFather
				</p>
			{/if}
		</div>

		<div>
			<label for="telegramChatId" class="mb-2 block text-sm font-medium"> Telegram Chat ID </label>
			<Input
				id="telegramChatId"
				name="telegramChatId"
				type="text"
				placeholder="-1001234567890"
				value={settings.telegramChatId || ''}
				disabled={envOverrides.telegramChatId}
			/>
			{#if envOverrides.telegramChatId}
				<p class="mt-1 text-xs text-blue-500">
					✓ This value is set via environment variable and cannot be changed here
				</p>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">
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
			<div class="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
				{form.error}
			</div>
		{/if}
	</form>

	<!-- Test results -->
	{#if testResults.length > 0}
		<div class="mt-6 space-y-2">
			<h3 class="font-medium">Test Results:</h3>
			{#each testResults as result (result.backend)}
				<div class="flex items-center gap-2">
					{#if result.success}
						<CheckCircle class="h-5 w-5 text-green-500" />
						<span class="text-sm">
							{result.backend}: <span class="text-green-500">Success</span>
						</span>
					{:else}
						<XCircle class="h-5 w-5 text-destructive" />
						<span class="text-sm">
							{result.backend}: <span class="text-destructive">Failed</span>
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</Card>
