<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { X, Download } from 'lucide-svelte';
	import type { AnnasArchiveSearchResult } from '$lib/types/download';

	let {
		isOpen = $bindable(),
		results,
		onSelect
	}: {
		isOpen: boolean;
		results: AnnasArchiveSearchResult[];
		onSelect: (result: AnnasArchiveSearchResult) => void;
	} = $props();

	function formatFileSize(bytes?: number): string {
		if (!bytes) return 'Unknown';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleSelect(result: AnnasArchiveSearchResult) {
		onSelect(result);
		isOpen = false;
	}

	function handleClose() {
		isOpen = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			handleBackdropClick(event as unknown as MouseEvent);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<Card class="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden">
			<div class="flex items-center justify-between border-b p-4">
				<h2 class="text-xl font-semibold">Select File to Download</h2>
				<button
					onclick={handleClose}
					class="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto p-4">
				{#if results.length === 0}
					<p class="py-8 text-center text-muted-foreground">No files found</p>
				{:else}
					<div class="space-y-3">
						{#each results as result (result.md5)}
							<Card
								class="cursor-pointer p-4 transition-colors hover:bg-accent/50"
								onclick={() => handleSelect(result)}
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0 flex-1">
										<h3 class="truncate font-medium">{result.title}</h3>
										<p class="truncate text-sm text-muted-foreground">{result.author}</p>

										<div class="mt-2 flex flex-wrap gap-2">
											{#if result.extension}
												<Badge variant="secondary">{result.extension.toUpperCase()}</Badge>
											{/if}
											{#if result.filesize}
												<Badge variant="secondary">{formatFileSize(result.filesize)}</Badge>
											{/if}
											{#if result.language}
												<Badge variant="secondary">{result.language}</Badge>
											{/if}
											{#if result.year}
												<Badge variant="secondary">{result.year}</Badge>
											{/if}
										</div>

										{#if result.publisher}
											<p class="mt-2 text-xs text-muted-foreground">
												Publisher: {result.publisher}
											</p>
										{/if}
									</div>

									<Button size="sm" variant="default">
										<Download class="mr-2 h-4 w-4" />
										Select
									</Button>
								</div>
							</Card>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex justify-end border-t p-4">
				<Button variant="outline" onclick={handleClose}>Cancel</Button>
			</div>
		</Card>
	</div>
{/if}
