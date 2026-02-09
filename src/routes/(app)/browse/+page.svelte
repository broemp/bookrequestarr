<script lang="ts">
	import { onMount } from 'svelte';
	import { debounce } from '$lib/utils/debounce';
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import BookCard from '$lib/components/BookCard.svelte';
	import BookDetailPanel from '$lib/components/BookDetailPanel.svelte';
	import { toast } from '$lib/stores/toast';
	import { Search, BookOpen, Loader2 } from 'lucide-svelte';
	import type { BookSearchResult } from '$lib/types/book';

	interface SearchBook extends BookSearchResult {
		has_ebook?: boolean;
		unreleased?: boolean;
		release_date?: string;
		rating?: number;
		dbId?: string;
		[key: string]: unknown;
	}

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let allSearchResults = $state<SearchBook[]>([]);
	let displayedResults = $state<SearchBook[]>([]);
	let isSearching = $state(false);
	let selectedBookId = $state<string | null>(null);
	let bookDetailPanelOpen = $state(false);
	let selectedSeries = $state<{
		id: string;
		name: string;
		fromBook?: { id: string; hardcoverId?: string };
	} | null>(null);
	let seriesBooks = $state<SearchBook[]>([]);
	let isLoadingSeries = $state(false);
	let filterUnwanted = $state(true);
	let displayCount = $state(20);
	let scrollContainer: HTMLElement | null = null;
	let requestedBooksMap = $state<Record<string, string[]>>({});

	const performSearch = debounce(async (query: string) => {
		if (query.length < 2) {
			allSearchResults = [];
			displayedResults = [];
			displayCount = 20;
			requestedBooksMap = {};
			return;
		}

		isSearching = true;
		displayCount = 20;

		try {
			// Fetch all results (up to 200)
			const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&limit=200`);
			if (response.ok) {
				let results = await response.json();

				// Apply filter if enabled
				if (filterUnwanted) {
					results = filterUnwantedBooks(results);
				}

				allSearchResults = results;
				displayedResults = results.slice(0, displayCount);

				// Check which books have been requested
				await checkRequestedBooks(results);
			}
		} catch (error) {
			console.error('Search error:', error);
		} finally {
			isSearching = false;
		}
	}, 300);

	async function checkRequestedBooks(books: SearchBook[]) {
		try {
			const hardcoverIds = books.map((b) => b.hardcoverId);
			const response = await fetch('/api/requests/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ hardcoverIds })
			});

			if (response.ok) {
				const { requestedBooks } = await response.json();
				requestedBooksMap = requestedBooks;
			}
		} catch (error) {
			console.error('Error checking requested books:', error);
		}
	}

	function loadMoreResults() {
		if (displayCount >= allSearchResults.length) return;

		displayCount += 20;
		displayedResults = allSearchResults.slice(0, displayCount);
	}

	// Derived state for checking if there are more results
	const hasMoreResults = $derived(displayCount < allSearchResults.length);

	// Infinite scroll handler
	function handleScroll() {
		if (!scrollContainer || !hasMoreResults) return;

		const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
		const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

		// Load more when user scrolls to 80% of the page
		if (scrollPercentage > 0.8) {
			loadMoreResults();
		}
	}

	// Set up scroll listener
	$effect(() => {
		if (typeof window !== 'undefined') {
			// Use the main content area for scroll detection
			scrollContainer = document.querySelector('main');

			if (scrollContainer) {
				scrollContainer.addEventListener('scroll', handleScroll);

				return () => {
					scrollContainer?.removeEventListener('scroll', handleScroll);
				};
			}
		}
	});

	// Filter out unwanted books (collections, no ebook, unreleased, etc.)
	function filterUnwantedBooks(books: SearchBook[]): SearchBook[] {
		return books.filter((book) => {
			// Filter out books with unknown authors
			const author = book.author?.toLowerCase() || '';
			if (!author || author === 'unknown' || author.trim() === '') {
				return false;
			}

			// Filter out collections and box sets
			const title = book.title?.toLowerCase() || '';
			if (
				title.includes('collection') ||
				title.includes('box set') ||
				title.includes('boxed set') ||
				title.includes('complete series') ||
				title.includes('trilogy')
			) {
				return false;
			}

			// Filter out books without ebooks (if the field exists)
			if (book.has_ebook === false) {
				return false;
			}

			// Filter out unreleased books (if the field exists)
			if (book.unreleased === true) {
				return false;
			}

			// Filter out books with future release dates
			if (book.publishDate || book.release_date) {
				const releaseDate = new Date(book.publishDate || book.release_date);
				const now = new Date();
				if (releaseDate > now) {
					return false;
				}
			}

			return true;
		});
	}

	$effect(() => {
		performSearch(searchQuery);
	});

	// Prevent body scroll when modal is open
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

	function openBookDetail(book: { id: string; hardcoverId?: string }) {
		selectedBookId = book.hardcoverId || book.id;
		bookDetailPanelOpen = true;
		updateUrlWithBookId(selectedBookId);
	}

	function updateUrlWithBookId(bookId: string | null) {
		const url = new URL(window.location.href);
		if (bookId) {
			url.searchParams.set('book', bookId);
		} else {
			url.searchParams.delete('book');
		}
		window.history.replaceState({}, '', url);
	}

	function handleBookDetailClose() {
		bookDetailPanelOpen = false;
		selectedBookId = null;
		updateUrlWithBookId(null);
	}

	async function handleQuickRequest(book: SearchBook) {
		const bookId = book.hardcoverId || book.id;
		const language = data.user?.lastUsedLanguage || data.user?.preferredLanguage || 'English';
		const format = data.user?.lastUsedFormat || 'ebook';

		try {
			const requestFormData = new FormData();
			requestFormData.set('bookId', book.dbId || '');
			requestFormData.set('hardcoverId', bookId);
			requestFormData.set('language', language);
			requestFormData.set('specialNotes', '');
			requestFormData.set('formatType', format);

			const response = await fetch('/api/requests/create', {
				method: 'POST',
				body: requestFormData
			});

			if (response.ok) {
				toast.show('Book requested successfully!', 'success');
				// Refresh the requested books list
				await checkRequestedBooks(allSearchResults);
			} else {
				const text = await response.text();
				if (response.status === 409) {
					toast.show('Book already requested', 'warning');
				} else {
					toast.show(text || 'Failed to create request', 'error');
				}
			}
		} catch (error) {
			console.error('Quick request error:', error);
			toast.show('Failed to create request', 'error');
		}
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
				console.error('Failed to fetch series books');
				seriesBooks = [];
			}
		} catch (error) {
			console.error('Error fetching series books:', error);
			seriesBooks = [];
		} finally {
			isLoadingSeries = false;
		}
	}

	function backToBook() {
		if (selectedSeries?.fromBook) {
			openBookDetail(selectedSeries.fromBook);
		}
		selectedSeries = null;
		seriesBooks = [];
	}

	// Sort books by position (now we only have one edition per book)
	const sortedSeriesBooks = $derived.by(() => {
		return [...seriesBooks].sort((a, b) => {
			// Books without position go to the end
			if (a.position === undefined || a.position === null) return 1;
			if (b.position === undefined || b.position === null) return -1;
			return Number(a.position) - Number(b.position);
		});
	});

	// Check for book ID in URL parameter on mount
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const bookId = urlParams.get('book');
		if (bookId) {
			selectedBookId = bookId;
			bookDetailPanelOpen = true;
		}
	});
</script>

<svelte:head>
	<title>Search Books - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">Search Books</h1>
		<p class="text-muted-foreground">Find and request your favorite books</p>
	</div>

	<!-- Search bar -->
	<Card class="p-4">
		<div class="space-y-3">
			<div class="relative">
				<Search class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
				<Input bind:value={searchQuery} placeholder="Search by title or author..." class="pl-10" />
			</div>

			<!-- Filter checkbox -->
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					bind:checked={filterUnwanted}
					class="h-4 w-4 cursor-pointer rounded border-gray-300 text-purple-600 focus:ring-purple-500"
					onchange={() => {
						// Re-run search with new filter setting
						if (searchQuery.length >= 2) {
							performSearch(searchQuery);
						}
					}}
				/>
				<span class="text-muted-foreground">
					Filter out collections, unreleased books, and non-ebook formats
				</span>
			</label>
		</div>
	</Card>

	<!-- Search results -->
	{#if isSearching}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	{:else if searchQuery.length >= 2}
		{#if displayedResults.length === 0}
			<Card class="p-12 text-center">
				<BookOpen class="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
				<p class="text-muted-foreground">No books found. Try a different search term.</p>
			</Card>
		{:else}
			<div class="space-y-6">
				<div
					class="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
				>
					{#each displayedResults as book (book.hardcoverId)}
						<BookCard
							book={{
								id: book.hardcoverId,
								title: book.title,
								coverImageUrl: book.coverImage,
								releaseYear: book.publishDate ? new Date(book.publishDate).getFullYear() : null,
								authors: book.author ? [book.author] : [],
								averageRating: book.rating
							}}
							showQuickRequest={true}
							requested={!!requestedBooksMap[book.hardcoverId]}
							onClick={() => openBookDetail(book)}
							onQuickRequest={() => handleQuickRequest(book)}
						/>
					{/each}
				</div>

				<!-- Show total count -->
				{#if allSearchResults.length > displayedResults.length}
					<div class="py-4 text-center">
						<p class="text-sm text-muted-foreground">
							Showing {displayedResults.length} of {allSearchResults.length} results
						</p>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<Card class="p-12 text-center">
			<Search class="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
			<p class="text-muted-foreground">Start typing to search for books</p>
		</Card>
	{/if}
</div>

<!-- Book detail panel -->
{#if selectedBookId}
	<BookDetailPanel
		bookId={selectedBookId}
		bind:open={bookDetailPanelOpen}
		onClose={handleBookDetailClose}
		onRequestSubmitted={async () => {
			await checkRequestedBooks(allSearchResults);
		}}
		onViewSeries={viewSeries}
		defaultLanguage={data.user?.lastUsedLanguage || data.user?.preferredLanguage || 'English'}
		defaultFormat={data.user?.lastUsedFormat || 'ebook'}
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
								← Back to Book
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
						class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					>
						{#each sortedSeriesBooks as book (book.hardcoverId || book.id)}
							<div class="relative">
								<!-- Position badge overlay -->
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
										openBookDetail(book);
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
