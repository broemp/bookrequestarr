<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	interface Tab {
		id: string;
		label: string;
		icon?: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab?: string;
		onTabChange?: (tabId: string) => void;
	}

	let { tabs, activeTab = $bindable(tabs[0]?.id), onTabChange }: Props = $props();

	function handleTabClick(tabId: string) {
		activeTab = tabId;
		onTabChange?.(tabId);

		// Update URL with tab parameter
		if (browser) {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', tabId);
			goto(url.toString(), { replaceState: true, noScroll: true });
		}
	}

	// Sync activeTab with URL on mount
	$effect(() => {
		if (browser) {
			const urlTab = new URL(window.location.href).searchParams.get('tab');
			if (urlTab && tabs.some((t) => t.id === urlTab)) {
				activeTab = urlTab;
			}
		}
	});
</script>

<div class="border-border mb-6 border-b">
	<nav class="flex space-x-8" aria-label="Tabs">
		{#each tabs as tab}
			<button
				type="button"
				onclick={() => handleTabClick(tab.id)}
				class="border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors"
				class:border-primary={activeTab === tab.id}
				class:text-foreground={activeTab === tab.id}
				class:border-transparent={activeTab !== tab.id}
				class:text-muted-foreground={activeTab !== tab.id}
				class:hover:text-foreground={activeTab !== tab.id}
				class:hover:border-border={activeTab !== tab.id}
				aria-current={activeTab === tab.id ? 'page' : undefined}
			>
				{#if tab.icon}
					<span class="mr-2">{tab.icon}</span>
				{/if}
				{tab.label}
			</button>
		{/each}
	</nav>
</div>
