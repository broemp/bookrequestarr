<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import RequestCard from '$lib/components/RequestCard.svelte';
	import BookDetailPanel from '$lib/components/BookDetailPanel.svelte';
	import BookCard from '$lib/components/BookCard.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { BookOpen, Plus, Loader2 } from 'lucide-svelte';

	interface SeriesBook {
		id: string;
		hardcoverId?: string;
		title: string;
		coverImage?: string;
		publishDate?: string;
		author?: string;
		rating?: number;
		position?: number;
		[key: string]: unknown;
	}

	let { data }: { data: PageData } = $props();

	let selectedBookId = $state<string | null>(null);
	let bookDetailPanelOpen = $state(false);
	let selectedSeries = $state<{
		id: string;
		name: string;
		fromBook?: { id: string; hardcoverId?: string };
	} | null>(null);
	let seriesBooks = $state<SeriesBook[]>([]);
	let isLoadingSeries = $state(false);

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
			hardcoverId: req.book.hardcoverId || undefined,
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
					r.bookTitle.toLowerCase().includes(search) || r.bookAuthor?.toLowerCase().includes(search)
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

	function openBookDetail(hardcoverId: string) {
		selectedBookId = hardcoverId;
		bookDetailPanelOpen = true;
	}

	function handleBookDetailClose() {
		bookDetailPanelOpen = false;
		selectedBookId = null;
	}

	async function viewSeries(
		seriesId: string,
		seriesName: string,
		fromBook?: { id: string; hardcoverId?: string }
	) {
		selectedSeries = { id: seriesId, name: seriesName, fromBook };
		bookDetailPanelOpen = false;
		isLoadingSeries = true;

		try {
			const response = await fetch(`/api/books/series/${seriesId}`);
			if (response.ok) {
				seriesBooks = await response.json();
			} else {
				seriesBooks = [];
			}
		} catch {
			seriesBooks = [];
		} finally {
			isLoadingSeries = false;
		}
	}

	function backToBook() {
		if (selectedSeries?.fromBook) {
			openBookDetail(selectedSeries.fromBook.hardcoverId || selectedSeries.fromBook.id);
		}
		selectedSeries = null;
		seriesBooks = [];
	}

	const sortedSeriesBooks = $derived.by(() => {
		return [...seriesBooks].sort((a, b) => {
			if (a.position === undefined || a.position === null) return 1;
			if (b.position === undefined || b.position === null) return -1;
			return Number(a.position) - Number(b.position);
		});
	});

	// Prevent body scroll when series modal is open
	$effect(() => {
		if (selectedSeries) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
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
	<div class="flex items-start justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">My Requests</h1>
			<p class="text-muted-foreground">Track the status of your book requests</p>
		</div>
		<a
			href={resolve('/browse')}
			class="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
		>
			<Plus class="mr-2 h-4 w-4" />
			Request a Book
		</a>
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
			<BookOpen class="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
			<p class="mb-4 text-muted-foreground">
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
					<a href={resolve('/browse')}>Search Books</a>
				</Button>
			{/if}
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredRequests() as request (request.id)}
				<RequestCard
				{request}
				showActions={false}
				showUserInfo={false}
				onBookClick={openBookDetail}
			/>
			{/each}
		</div>
	{/if}
</div>

<!-- Book detail panel -->
{#if selectedBookId}
	<BookDetailPanel
		bookId={selectedBookId}
		bind:open={bookDetailPanelOpen}
		onClose={handleBookDetailClose}
		onViewSeries={viewSeries}
	/>
{/if}

<!-- Series modal -->
{#if selectedSeries}
	<button
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		style="background-color: rgba(0, 0, 0, 0.5);"
		onclick={() => {
			selectedSeries = null;
			seriesBooks = [];
		}}
		aria-label="Close series modal"
	>
		<div
			class="max-h-[90vh] w-full max-w-7xl overflow-y-auto"
			onclick={(e: MouseEvent) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<Card class="p-6">
				<div class="mb-6 flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">{selectedSeries.name}</h2>
						<p class="text-sm text-muted-foreground">
							{sortedSeriesBooks.length}
							{sortedSeriesBooks.length === 1 ? 'book' : 'books'} in this series
						</p>
					</div>
					<div class="flex gap-2">
						{#if selectedSeries.fromBook}
							<Button
								variant="outline"
								onclick={() => {
									backToBook();
								}}
							>
								&#8592; Back to Book
							</Button>
						{/if}
						<Button
							variant="outline"
							onclick={() => {
								selectedSeries = null;
								seriesBooks = [];
							}}
						>
							Close
						</Button>
					</div>
				</div>

				{#if isLoadingSeries}
					<div class="flex items-center justify-center py-12">
						<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else if sortedSeriesBooks.length === 0}
					<div class="py-12 text-center">
						<BookOpen class="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
						<p class="text-muted-foreground">No books found in this series.</p>
					</div>
				{:else}
					<div
						class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
					>
						{#each sortedSeriesBooks as book (book.hardcoverId || book.id)}
							<div class="relative">
								{#if book.position !== undefined && book.position !== null}
									<div
										class="absolute top-2 left-2 z-10 rounded-md bg-purple-600 px-2 py-1 text-xs font-bold text-white shadow-md"
									>
										#{book.position}
									</div>
								{/if}
								<BookCard
									book={{
										id: book.hardcoverId || book.id,
										title: book.title,
										coverImageUrl: book.coverImage,
										releaseYear: book.publishDate ? new Date(book.publishDate).getFullYear() : null,
										authors: book.author ? [book.author] : [],
										averageRating: book.rating
									}}
									onClick={() => {
										selectedSeries = null;
										seriesBooks = [];
										openBookDetail(book.hardcoverId || book.id);
									}}
								/>
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		</div>
	</button>
{/if}
