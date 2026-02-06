<script lang="ts">
	import type { PageData } from './$types';
	import RequestCard from '$lib/components/RequestCard.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { BookOpen } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// State for filtering and sorting
	let activeFilter = $state('all');
	let searchValue = $state('');
	let sortBy = $state('newest');

	// Transform data for RequestCard component
	const transformedRequests = $derived(
		data.requests.map((req) => ({
			id: req.id,
			bookTitle: req.book.title,
			bookAuthor: req.book.author || undefined,
			bookCoverUrl: req.book.coverImage || undefined,
			language: req.language || 'Unknown',
			formatType: req.formatType,
			status: req.status,
			specialNotes: req.specialNotes || undefined,
			createdAt: req.createdAt.toString(),
			download:
				req.download && req.download.id
					? {
							id: req.download.id,
							status: req.download.downloadStatus,
							errorMessage: req.download.errorMessage
								? formatErrorMessage(req.download.errorMessage)
								: undefined,
							source: req.download.downloadSource || undefined,
							fileName: req.download.fileType || undefined,
							fileFormat: req.download.fileType || undefined,
							fileSize: req.download.fileSize || undefined,
							progress: undefined // Progress would come from SABnzbd polling in real-time
						}
					: undefined
		}))
	);

	// Filter configuration
	const filters = $derived([
		{
			id: 'all',
			label: 'All',
			count: transformedRequests.length
		},
		{
			id: 'pending',
			label: 'Pending',
			count: transformedRequests.filter((r) => r.status === 'pending').length
		},
		{
			id: 'approved',
			label: 'Approved',
			count: transformedRequests.filter((r) => r.status === 'approved').length
		},
		{
			id: 'completed',
			label: 'Completed',
			count: transformedRequests.filter((r) => r.status === 'completed').length
		},
		{
			id: 'download_problem',
			label: 'Failed',
			count: transformedRequests.filter((r) => r.status === 'download_problem').length
		},
		{
			id: 'rejected',
			label: 'Rejected',
			count: transformedRequests.filter((r) => r.status === 'rejected').length
		}
	]);

	// Apply filters and search
	const filteredRequests = $derived(() => {
		let result = transformedRequests;

		// Apply status filter
		if (activeFilter !== 'all') {
			result = result.filter((r) => r.status === activeFilter);
		}

		// Apply search filter
		if (searchValue.trim()) {
			const search = searchValue.toLowerCase();
			result = result.filter(
				(r) =>
					r.bookTitle.toLowerCase().includes(search) ||
					r.bookAuthor?.toLowerCase().includes(search)
			);
		}

		// Apply sorting
		if (sortBy === 'newest') {
			result = [...result].sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		} else if (sortBy === 'oldest') {
			result = [...result].sort(
				(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
		} else if (sortBy === 'title') {
			result = [...result].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
		}

		return result;
	});

	// User-friendly error messages
	function formatErrorMessage(error: string): string {
		const lowerError = error.toLowerCase();

		// HTTP errors
		if (lowerError.includes('http 404') || lowerError.includes('not found')) {
			return 'Book not found in download sources';
		}
		if (lowerError.includes('http 403') || lowerError.includes('forbidden')) {
			return 'Access denied to download source';
		}
		if (lowerError.includes('http 400') || lowerError.includes('bad request')) {
			return 'Invalid request to download source';
		}
		if (lowerError.includes('http 500') || lowerError.includes('internal server error')) {
			return 'Download source server error';
		}

		// Network errors
		if (lowerError.includes('network') || lowerError.includes('timeout')) {
			return 'Network connection problem';
		}
		if (lowerError.includes('connection refused')) {
			return 'Could not connect to download service';
		}

		// Download-specific errors
		if (lowerError.includes('no results') || lowerError.includes('no matches')) {
			return 'No matching books found';
		}
		if (lowerError.includes('confidence') || lowerError.includes('low match')) {
			return 'No confident match found for this book';
		}
		if (lowerError.includes('failed to download')) {
			return 'Download failed';
		}

		// Generic fallback (keep it short and user-friendly)
		return 'Download failed';
	}
</script>

<svelte:head>
	<title>My Requests - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">My Requests</h1>
		<p class="text-muted-foreground">Track the status of your book requests</p>
	</div>

	<!-- Filter Bar -->
	<FilterBar
		{filters}
		bind:activeFilter
		bind:searchValue
		bind:sortBy
		sortOptions={[
			{ value: 'newest', label: 'Newest First' },
			{ value: 'oldest', label: 'Oldest First' },
			{ value: 'title', label: 'Title A-Z' }
		]}
	/>

	<!-- Requests list -->
	{#if filteredRequests().length === 0}
		<Card class="p-12 text-center">
			<BookOpen class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
			<p class="text-muted-foreground mb-4">
				{#if searchValue.trim()}
					No requests found matching "{searchValue}"
				{:else if activeFilter === 'all'}
					No requests yet
				{:else}
					No {activeFilter} requests
				{/if}
			</p>
			{#if !searchValue.trim() && activeFilter === 'all'}
				<Button>
					<a href="/browse">Search Books</a>
				</Button>
			{/if}
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredRequests() as request (request.id)}
				<RequestCard {request} showActions={false} showUserInfo={false} />
			{/each}
		</div>
	{/if}
</div>
