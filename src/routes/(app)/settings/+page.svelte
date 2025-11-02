<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import LanguageSelect from '$lib/components/LanguageSelect.svelte';
	import { User, Save } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();

	let preferredLanguage = $state(data.user?.preferredLanguage || 'English');
</script>

<svelte:head>
	<title>Settings - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Manage your account preferences</p>
	</div>

	<!-- User Preferences -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<User class="h-6 w-6" />
			<h2 class="text-xl font-semibold">User Preferences</h2>
		</div>

		<form method="POST" action="?/updatePreferences" use:enhance class="space-y-4">
			<div>
				<label for="preferredLanguage" class="mb-2 block text-sm font-medium">
					Preferred Language
				</label>
				<LanguageSelect
					id="preferredLanguage"
					name="preferredLanguage"
					bind:value={preferredLanguage}
					placeholder="Select or type a language..."
				/>
				<p class="text-muted-foreground mt-1 text-xs">
					This will be the default language when requesting books
				</p>
			</div>

			<div class="flex gap-3">
				<Button type="submit">
					<Save class="mr-2 h-4 w-4" />
					Save Preferences
				</Button>
			</div>

			{#if form?.success}
				<div class="rounded-md bg-green-500/10 p-4 text-sm text-green-500">
					Preferences saved successfully! Reload the page to see changes.
				</div>
			{/if}

			{#if form?.error}
				<div class="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
					{form.error}
				</div>
			{/if}
		</form>
	</Card>

	<!-- Account Information -->
	<Card class="p-6">
		<div class="mb-4 flex items-center gap-3">
			<User class="h-6 w-6" />
			<h2 class="text-xl font-semibold">Account Information</h2>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Display Name</p>
					<p class="text-muted-foreground text-sm">{data.user?.displayName}</p>
				</div>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Username</p>
					<p class="text-muted-foreground text-sm">{data.user?.username}</p>
				</div>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Email</p>
					<p class="text-muted-foreground text-sm">{data.user?.email}</p>
				</div>
			</div>
		</div>
	</Card>
</div>
