<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { Settings } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface Props {
		settings: {
			hardcoverApiKey: string;
			localBookCacheTtlHours: string;
		};
		envOverrides: {
			hardcoverApiKey: boolean;
		};
		form: any;
	}

	let { settings, envOverrides, form }: Props = $props();
</script>

<Card class="p-6">
	<div class="mb-4 flex items-center gap-3">
		<Settings class="h-6 w-6" />
		<h2 class="text-xl font-semibold">API Settings</h2>
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
			<label for="hardcoverApiKey" class="mb-2 block text-sm font-medium">
				Hardcover API Key
			</label>
			<Input
				id="hardcoverApiKey"
				name="hardcoverApiKey"
				type="text"
				placeholder="your-hardcover-api-key"
				value={settings.hardcoverApiKey || ''}
				disabled={envOverrides.hardcoverApiKey}
			/>
			{#if envOverrides.hardcoverApiKey}
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
			<label for="localBookCacheTtlHours" class="mb-2 block text-sm font-medium">
				Local Book Cache TTL (Hours)
			</label>
			<Input
				id="localBookCacheTtlHours"
				name="localBookCacheTtlHours"
				type="number"
				min="1"
				max="168"
				placeholder="6"
				value={settings.localBookCacheTtlHours || '6'}
			/>
			<p class="text-muted-foreground mt-1 text-xs">
				How long to keep book details in local database cache for instant loading (default: 6 hours)
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
