<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface Filter {
		id: string;
		label: string;
		count?: number;
	}

	interface Props {
		filters: Filter[];
		activeFilter?: string;
		searchValue?: string;
		sortBy?: string;
		sortOptions?: { value: string; label: string }[];
		onFilterChange?: (filterId: string) => void;
		onSearchChange?: (value: string) => void;
		onSortChange?: (value: string) => void;
	}

	let {
		filters,
		activeFilter = $bindable(filters[0]?.id || 'all'),
		searchValue = $bindable(''),
		sortBy = $bindable('newest'),
		sortOptions = [
			{ value: 'newest', label: 'Newest First' },
			{ value: 'oldest', label: 'Oldest First' },
			{ value: 'title', label: 'Title A-Z' }
		],
		onFilterChange,
		onSearchChange,
		onSortChange
	}: Props = $props();

	function handleFilterClick(filterId: string) {
		activeFilter = filterId;
		onFilterChange?.(filterId);
		updateURL();
	}

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchValue = target.value;
		onSearchChange?.(searchValue);
		updateURL();
	}

	function handleSortChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		sortBy = target.value;
		onSortChange?.(sortBy);
		updateURL();
	}

	function updateURL() {
		if (!browser) return;

		const url = new URL(window.location.href);
		url.searchParams.set('filter', activeFilter);
		if (searchValue) {
			url.searchParams.set('search', searchValue);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('sort', sortBy);

		goto(resolve(url.pathname + url.search), { replaceState: true, noScroll: true });
	}

	// Sync with URL on mount
	$effect(() => {
		if (browser) {
			const url = new URL(window.location.href);
			const urlFilter = url.searchParams.get('filter');
			const urlSearch = url.searchParams.get('search');
			const urlSort = url.searchParams.get('sort');

			if (urlFilter && filters.some((f) => f.id === urlFilter)) {
				activeFilter = urlFilter;
			}
			if (urlSearch) {
				searchValue = urlSearch;
			}
			if (urlSort) {
				sortBy = urlSort;
			}
		}
	});
</script>

<div class="mb-6 flex flex-col gap-4">
	<!-- Filter buttons -->
	<div class="flex flex-wrap gap-2">
		{#each filters as filter (filter.id)}
			<button
				type="button"
				onclick={() => handleFilterClick(filter.id)}
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {activeFilter ===
				filter.id
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}"
			>
				{filter.label}
				{#if filter.count !== undefined}
					<span class="ml-2 opacity-70">({filter.count})</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Search and sort -->
	<div class="flex flex-col gap-4 sm:flex-row">
		<!-- Search input -->
		<div class="flex-1">
			<input
				type="text"
				placeholder="Search by title or author..."
				value={searchValue}
				oninput={handleSearchInput}
				class="bg-background border-border focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
			/>
		</div>

		<!-- Sort dropdown -->
		<div class="sm:w-48">
			<select
				value={sortBy}
				onchange={handleSortChange}
				class="bg-background border-border focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
			>
				{#each sortOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>
</div>
