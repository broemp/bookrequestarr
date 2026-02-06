<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	interface Tab {
		id: string;
		label: string;
		icon?: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab?: string;
		onTabChange?: (tabId: string) => void;
		param?: string; // URL param name (default: 'section')
	}

	let {
		tabs,
		activeTab = $bindable(tabs[0]?.id),
		onTabChange,
		param = 'section'
	}: Props = $props();

	function handleTabClick(tabId: string) {
		activeTab = tabId;
		onTabChange?.(tabId);

		// Update URL with section parameter
		if (browser) {
			const url = new URL(window.location.href);
			url.searchParams.set(param, tabId);
			goto(url.toString(), { replaceState: true, noScroll: true });
		}
	}

	// Sync activeTab with URL on mount
	$effect(() => {
		if (browser) {
			const urlSection = new URL(window.location.href).searchParams.get(param);
			if (urlSection && tabs.some((t) => t.id === urlSection)) {
				activeTab = urlSection;
			}
		}
	});
</script>

<nav class="flex flex-col space-y-1" aria-label="Vertical tabs">
	{#each tabs as tab}
		<button
			type="button"
			onclick={() => handleTabClick(tab.id)}
			class="rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors {activeTab ===
			tab.id
				? 'bg-muted text-foreground'
				: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
			aria-current={activeTab === tab.id ? 'page' : undefined}
		>
			{#if tab.icon}
				<span class="mr-2">{tab.icon}</span>
			{/if}
			{tab.label}
		</button>
	{/each}
</nav>
