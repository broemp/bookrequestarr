<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import BookCard from '$lib/components/BookCard.svelte';
	import BookDetailPanel from '$lib/components/BookDetailPanel.svelte';
	import RequestCard from '$lib/components/RequestCard.svelte';
	import { BookOpen, Clock, CheckCircle } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Book detail panel state
	let selectedBookId = $state<string | null>(null);
	let bookDetailPanelOpen = $state(false);

	// URL state management
	$effect(() => {
		const urlBookId = $page.url.searchParams.get('book');
		if (urlBookId && urlBookId !== selectedBookId) {
			selectedBookId = urlBookId;
			bookDetailPanelOpen = true;
		}
	});

	function handleBookClick(book: { id: string }) {
		// BookCard passes book.id which is the hardcoverId
		selectedBookId = book.id;
		bookDetailPanelOpen = true;
		// Update URL without navigation
		const url = new URL(window.location.href);
		url.searchParams.set('book', book.id);
		window.history.pushState({}, '', url);
	}

	function handleQuickRequest(book: { id: string }) {
		handleBookClick(book);
	}

	function handlePanelClose() {
		bookDetailPanelOpen = false;
		selectedBookId = null;
		// Remove book from URL
		const url = new URL(window.location.href);
		url.searchParams.delete('book');
		window.history.pushState({}, '', url);
	}

	async function handleRequestSubmitted() {
		// Reload page data to update stats and recent requests
		window.location.reload();
	}

	// Transform trending books data to match BookCard interface
	const trendingBooksForCards = $derived(
		data.trendingBooks.map((book) => ({
			id: book.hardcoverId,
			title: book.title,
			coverImageUrl: book.coverImage,
			releaseYear: book.releaseYear,
			authors: book.author ? [book.author] : [],
			averageRating: book.rating ? parseFloat(book.rating) : null
		}))
	);

	// Transform recent requests to match RequestCard interface
	const recentRequestsForCards = $derived(
		data.recentRequests.map((req) => ({
			id: req.id,
			bookTitle: req.book.title,
			bookAuthor: req.book.author || undefined,
			bookCoverUrl: req.book.coverImage || undefined,
			language: req.language || 'English',
			formatType: req.formatType,
			status: req.status,
			specialNotes: req.specialNotes || undefined,
			createdAt: req.createdAt.toString(),
			download: req.download?.id
				? {
						id: req.download.id,
						status: req.download.downloadStatus,
						errorMessage: req.download.errorMessage || undefined,
						source: req.download.downloadSource || undefined,
						fileFormat: req.download.fileType || undefined,
						fileSize: req.download.fileSize || undefined
					}
				: undefined
		}))
	);
</script>

<svelte:head>
	<title>Dashboard - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<!-- Welcome section -->
	<div>
		<h1 class="mb-2 text-3xl font-bold">Welcome back, {data.user.displayName}!</h1>
		<p class="text-muted-foreground">Here's what's happening with your book requests.</p>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Requests</p>
					<p class="text-2xl font-bold">{data.stats.total}</p>
				</div>
				<BookOpen class="text-muted-foreground h-8 w-8" />
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Pending</p>
					<p class="text-2xl font-bold">{data.stats.pending}</p>
				</div>
				<Clock class="h-8 w-8 text-yellow-500" />
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Approved</p>
					<p class="text-2xl font-bold">{data.stats.approved}</p>
				</div>
				<CheckCircle class="h-8 w-8 text-green-500" />
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Completed</p>
					<p class="text-2xl font-bold">{data.stats.completed}</p>
				</div>
				<CheckCircle class="h-8 w-8 text-blue-500" />
			</div>
		</Card>
	</div>

	<!-- Trending Books -->
	{#if trendingBooksForCards.length > 0}
		<div>
			<h2 class="mb-4 text-2xl font-bold">Trending Books</h2>
			<div
				class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
			>
				{#each trendingBooksForCards as book (book.id)}
					<BookCard
						{book}
						showQuickRequest={true}
						onClick={handleBookClick}
						onQuickRequest={handleQuickRequest}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- My Recent Requests -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-2xl font-bold">My Recent Requests</h2>
			<Button variant="outline" size="sm">
				<a href={resolve('/requests')}>View All</a>
			</Button>
		</div>

		{#if recentRequestsForCards.length === 0}
			<Card class="p-8 text-center">
				<div class="text-muted-foreground">
					<BookOpen class="mx-auto mb-3 h-12 w-12 opacity-50" />
					<p>No requests yet. Start by browsing for books!</p>
					<Button class="mt-4">
						<a href={resolve('/browse')}>Browse Books</a>
					</Button>
				</div>
			</Card>
		{:else}
			<div class="space-y-4">
				{#each recentRequestsForCards as request (request.id)}
					<RequestCard {request} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Book Detail Panel -->
{#if selectedBookId}
	<BookDetailPanel
		bookId={selectedBookId}
		bind:open={bookDetailPanelOpen}
		onClose={handlePanelClose}
		onRequestSubmitted={handleRequestSubmitted}
		defaultLanguage={data.user.lastUsedLanguage || 'English'}
		defaultFormat={data.user.lastUsedFormat || 'ebook'}
	/>
{/if}
