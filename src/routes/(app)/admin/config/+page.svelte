<script lang="ts">
	import type { PageData } from './$types';
	import TabNavigation from '$lib/components/TabNavigation.svelte';
	import ApiSettings from './tabs/ApiSettings.svelte';
	import DownloadSettings from './tabs/DownloadSettings.svelte';
	import NotificationSettings from './tabs/NotificationSettings.svelte';
	import SystemSettings from './tabs/SystemSettings.svelte';

	let { data, form }: { data: PageData; form: any } = $props();

	let activeTab = $state('api');

	const tabs = [
		{ id: 'api', label: 'API' },
		{ id: 'downloads', label: 'Downloads' },
		{ id: 'notifications', label: 'Notifications' },
		{ id: 'system', label: 'System' }
	];
</script>

<svelte:head>
	<title>Admin: Configuration - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">Configuration</h1>
		<p class="text-muted-foreground">Configure application settings and integrations</p>
	</div>

	<TabNavigation {tabs} bind:activeTab />

	{#if activeTab === 'api'}
		<ApiSettings settings={data.settings} envOverrides={data.envOverrides} {form} />
	{:else if activeTab === 'downloads'}
		<DownloadSettings settings={data.settings} envOverrides={data.envOverrides} {form} />
	{:else if activeTab === 'notifications'}
		<NotificationSettings settings={data.settings} envOverrides={data.envOverrides} {form} />
	{:else if activeTab === 'system'}
		<SystemSettings stats={data.stats} />
	{/if}
</div>
