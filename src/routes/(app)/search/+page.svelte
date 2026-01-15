<script lang="ts">
	import { onMount } from 'svelte';
	import { debounce } from '$lib/utils/debounce';
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import LanguageSelect from '$lib/components/LanguageSelect.svelte';
	import { toast } from '$lib/stores/toast';
	import { Search, BookOpen, Loader2 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let allSearchResults = $state<any[]>([]); // All results from API
	let displayedResults = $state<any[]>([]); // Results currently displayed
	let isSearching = $state(false);
	let selectedBook = $state<any>(null);
	let selectedLanguage = $state(data.user?.preferredLanguage || 'English');
	let selectedSeries = $state<{ id: string; name: string; fromBook?: any } | null>(null);
	let seriesBooks = $state<any[]>([]);
	let isLoadingSeries = $state(false);
	let filterUnwanted = $state(true);
	let displayCount = $state(20);
	let scrollContainer: HTMLElement | null = null;
	let requestedBooksMap = $state<Record<string, string[]>>({});
	let isLoadingBook = $state(false);

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

	async function checkRequestedBooks(books: any[]) {
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
	function filterUnwantedBooks(books: any[]): any[] {
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
		if (selectedBook || selectedSeries) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	async function selectBook(book: any) {
		isLoadingBook = true;
		selectedBook = book;
		try {
			// Fetch full details
			const response = await fetch(`/api/books/${book.hardcoverId}`);
			if (response.ok) {
				selectedBook = await response.json();
				console.log('Selected book with dbId:', selectedBook.dbId, 'hardcoverId:', selectedBook.id);
			} else {
				console.error('Failed to fetch book details:', await response.text());
				toast.show('Failed to load book details', 'error');
				selectedBook = null;
			}
		} catch (error) {
			console.error('Error fetching book details:', error);
			toast.show('Failed to load book details', 'error');
			selectedBook = null;
		} finally {
			isLoadingBook = false;
		}
	}

	async function selectBookById(bookId: string) {
		console.log('[selectBookById] Called with bookId:', bookId);
		isLoadingBook = true;
		try {
			const response = await fetch(`/api/books/${bookId}`);
			console.log('[selectBookById] Response status:', response.status);
			if (response.ok) {
				selectedBook = await response.json();
				console.log(
					'[selectBookById] Selected book:',
					selectedBook.title,
					'dbId:',
					selectedBook.dbId,
					'hardcoverId:',
					selectedBook.id
				);
			} else {
				const errorText = await response.text();
				console.error('[selectBookById] Failed to fetch book details:', errorText);
				toast.show('Failed to load book details', 'error');
			}
		} catch (error) {
			console.error('[selectBookById] Error fetching book details:', error);
			toast.show('Failed to load book details', 'error');
		} finally {
			isLoadingBook = false;
		}
	}

	// Create Hardcover URL slug from book data
	function createHardcoverUrl(book: any): string {
		if (!book.id) return 'https://hardcover.app';

		// If the API provides a slug, use it directly
		if (book.slug) {
			return `https://hardcover.app/books/${book.slug}`;
		}

		// Otherwise, create slug from title
		if (!book.title) return 'https://hardcover.app';

		const slug = book.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

		return `https://hardcover.app/books/${slug}`;
	}

	async function viewSeries(seriesId: string, seriesName: string, fromBook?: any) {
		selectedSeries = { id: seriesId, name: seriesName, fromBook };
		const previousBook = selectedBook;
		selectedBook = null;
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
			selectedBook = selectedSeries.fromBook;
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
		console.log('[onMount] Called');
		const urlParams = new URLSearchParams(window.location.search);
		const bookId = urlParams.get('book');
		console.log('[onMount] Book ID from URL:', bookId);
		if (bookId) {
			console.log('[onMount] Calling selectBookById');
			// Fetch and open the book modal
			selectBookById(bookId);
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
				<Search class="text-muted-foreground absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
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
			<Loader2 class="text-muted-foreground h-8 w-8 animate-spin" />
		</div>
	{:else if searchQuery.length >= 2}
		{#if displayedResults.length === 0}
			<Card class="p-12 text-center">
				<BookOpen class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
				<p class="text-muted-foreground">No books found. Try a different search term.</p>
			</Card>
		{:else}
			<div class="space-y-6">
				<div
					class="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
				>
					{#each displayedResults as book}
						<button
							class="group flex flex-col gap-2 text-left transition-transform hover:scale-105"
							onclick={() => selectBook(book)}
						>
							<!-- Book cover with aspect ratio -->
							<div
								class="relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-md transition-shadow group-hover:shadow-xl"
							>
								{#if book.coverImage}
									<img src={book.coverImage} alt={book.title} class="h-full w-full object-cover" />
								{:else}
									<div class="bg-muted flex h-full w-full items-center justify-center">
										<BookOpen class="text-muted-foreground h-8 w-8" />
									</div>
								{/if}

								<!-- Requested badge -->
								{#if requestedBooksMap[book.hardcoverId]}
									<div
										class="absolute top-2 right-2 rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white shadow-lg"
										title="Requested in: {requestedBooksMap[book.hardcoverId].join(', ')}"
									>
										Requested
									</div>
								{/if}
							</div>

							<!-- Book info -->
							<div class="flex flex-col gap-0.5">
								<h3 class="line-clamp-2 text-sm leading-tight font-medium">{book.title}</h3>
								<p class="text-muted-foreground line-clamp-1 text-xs">
									{book.author || 'Unknown'}
								</p>
								{#if book.publishDate}
									<p class="text-muted-foreground text-xs">
										{new Date(book.publishDate).getFullYear()}
									</p>
								{/if}
							</div>
						</button>
					{/each}
				</div>

				<!-- Show total count -->
				{#if allSearchResults.length > displayedResults.length}
					<div class="py-4 text-center">
						<p class="text-muted-foreground text-sm">
							Showing {displayedResults.length} of {allSearchResults.length} results
						</p>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<Card class="p-12 text-center">
			<Search class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
			<p class="text-muted-foreground">Start typing to search for books</p>
		</Card>
	{/if}
</div>

<!-- Loading modal -->
{#if isLoadingBook}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		style="background-color: rgba(0, 0, 0, 0.5);"
	>
		<Card class="flex flex-col items-center gap-4 p-8">
			<Loader2 class="h-12 w-12 animate-spin text-purple-400" />
			<p class="text-lg font-medium">Loading book details...</p>
		</Card>
	</div>
{/if}

<!-- Book detail modal -->
{#if selectedBook && !isLoadingBook}
	<button
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		style="background-color: rgba(0, 0, 0, 0.5);"
		onclick={() => {
			selectedBook = null;
		}}
		aria-label="Close modal"
	>
		<div
			class="max-h-[90vh] w-full max-w-6xl overflow-y-auto"
			onclick={(e: MouseEvent) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<Card class="p-0">
				<div class="p-8">
					<!-- Two column layout -->
					<div class="flex flex-col gap-8 lg:flex-row">
						<!-- Left side: Book information -->
						<div class="min-w-0 flex-1">
							<!-- Header with cover and main info -->
							<div class="mb-6 flex gap-6">
								{#if selectedBook.image?.url || selectedBook.coverImage}
									<img
										src={selectedBook.image?.url || selectedBook.coverImage}
										alt={selectedBook.title}
										class="h-80 w-56 flex-shrink-0 rounded-lg object-cover shadow-xl"
									/>
								{:else}
									<div
										class="bg-muted flex h-80 w-56 flex-shrink-0 items-center justify-center rounded-lg"
									>
										<BookOpen class="text-muted-foreground h-20 w-20" />
									</div>
								{/if}

								<div class="flex min-w-0 flex-1 flex-col items-center text-center">
									<h2 class="mb-2 text-3xl leading-tight font-bold">{selectedBook.title}</h2>
									{#if selectedBook.subtitle}
										<p class="text-muted-foreground mb-3 text-lg">{selectedBook.subtitle}</p>
									{/if}

									{#if selectedBook.contributions && selectedBook.contributions.length > 0}
										<p class="text-muted-foreground mb-4 text-base">
											by {selectedBook.contributions.map((c: any) => c.author.name).join(', ')}
										</p>
									{:else if selectedBook.author}
										<p class="text-muted-foreground mb-4 text-base">by {selectedBook.author}</p>
									{/if}

									<!-- Series information -->
									{#if selectedBook.book_series && selectedBook.book_series.length > 0}
										<div class="mb-4 flex flex-col items-center gap-1.5">
											{#each selectedBook.book_series as series}
												<button
													type="button"
													class="text-sm font-medium text-purple-400 transition-colors hover:text-purple-300"
													onclick={() =>
														viewSeries(series.series.id, series.series.name, selectedBook)}
												>
													{series.series.name}
													{#if series.position}
														<span class="text-muted-foreground">• Book {series.position}</span>
													{/if}
												</button>
											{/each}
										</div>
									{/if}

									<!-- Book details -->
									<div
										class="text-muted-foreground mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
									>
										{#if selectedBook.rating}
											<div class="flex items-center gap-1.5">
												<span class="font-medium">Rating:</span>
												<span>⭐ {Number(selectedBook.rating).toFixed(1)}</span>
												{#if selectedBook.ratings_count}
													<span class="text-xs"
														>({selectedBook.ratings_count.toLocaleString()} ratings)</span
													>
												{/if}
											</div>
										{/if}
										{#if selectedBook.release_date || selectedBook.publishDate}
											<div class="flex items-center gap-1.5">
												<span class="font-medium">Published:</span>
												<span
													>{new Date(
														selectedBook.release_date || selectedBook.publishDate
													).getFullYear()}</span
												>
											</div>
										{/if}
										{#if selectedBook.pages}
											<div class="flex items-center gap-1.5">
												<span class="font-medium">Pages:</span>
												<span>{selectedBook.pages}</span>
											</div>
										{/if}
										{#if selectedBook.language}
											<div class="flex items-center gap-1.5">
												<span class="font-medium">Language:</span>
												<span>{selectedBook.language}</span>
											</div>
										{/if}
										{#if selectedBook.publisher}
											<div class="flex items-center gap-1.5">
												<span class="font-medium">Publisher:</span>
												<span>{selectedBook.publisher}</span>
											</div>
										{/if}
										{#if selectedBook.isbn}
											<div class="flex items-center gap-1.5">
												<span class="font-medium">ISBN:</span>
												<span>{selectedBook.isbn}</span>
											</div>
										{/if}
									</div>

									<!-- Hardcover button -->
									<a
										href={createHardcoverUrl(selectedBook)}
										target="_blank"
										rel="noopener noreferrer"
										class="mb-4 inline-flex items-center justify-center gap-2 rounded-md border border-purple-500/30 px-4 py-2 text-sm font-medium text-purple-400 transition-colors hover:border-purple-500/50 hover:text-purple-300"
									>
										<span>View on Hardcover</span>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
									</a>

									<!-- Genres -->
									{#if selectedBook.taggings && selectedBook.taggings.length > 0}
										<div class="w-full">
											<h4 class="mb-2 text-center text-sm font-semibold">Genres</h4>
											<div class="flex flex-wrap justify-center gap-2">
												{#each selectedBook.taggings.slice(0, 6) as tagging}
													<span
														class="rounded-full border border-purple-600/30 bg-purple-600/20 px-3 py-1 text-xs font-medium text-purple-300"
													>
														{tagging.tag.tag}
													</span>
												{/each}
												{#if selectedBook.taggings.length > 6}
													<span
														class="rounded-full border border-purple-600/20 bg-purple-600/10 px-3 py-1 text-xs font-medium text-purple-400/60 italic"
													>
														+{selectedBook.taggings.length - 6} more
													</span>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							</div>

							<!-- Summary section -->
							{#if selectedBook.description}
								<div class="border-border border-t pt-6">
									<h3 class="mb-3 text-lg font-semibold">Summary</h3>
									<p class="text-muted-foreground text-sm leading-relaxed">
										{selectedBook.description}
									</p>
								</div>
							{/if}
						</div>

						<!-- Right side: Request form -->
						<div
							class="border-border flex w-full flex-shrink-0 flex-col lg:w-[420px] lg:border-l lg:pl-8"
						>
							<h3 class="mb-4 text-xl font-semibold">Request This Book</h3>

							<form
								method="POST"
								action="/api/requests/create"
								class="flex flex-1 flex-col"
								onsubmit={async (e) => {
									e.preventDefault();
									console.log(
										'Submitting request with bookId:',
										selectedBook.dbId,
										'hardcoverId:',
										selectedBook.id
									);

									const formData = new FormData(e.currentTarget);

									try {
										const response = await fetch('/api/requests/create', {
											method: 'POST',
											body: formData
										});

										if (response.ok) {
											toast.show('Book requested successfully!', 'success');
											selectedBook = null;
											// Refresh the requested books list
											await checkRequestedBooks(allSearchResults);
										} else {
											const text = await response.text();
											if (response.status === 409) {
												toast.show('This book has already been requested', 'warning');
											} else {
												toast.show(text || 'Failed to create request', 'error');
											}
										}
									} catch (error) {
										console.error('Request error:', error);
										toast.show('Failed to create request', 'error');
									}
								}}
							>
								<input type="hidden" name="bookId" value={selectedBook.dbId || ''} />
								<input type="hidden" name="hardcoverId" value={selectedBook.id || ''} />

								<div class="flex-1 space-y-4">
									<div>
										<label for="language" class="mb-2 block text-sm font-medium">
											Preferred Language
										</label>
										<LanguageSelect
											id="language"
											name="language"
											bind:value={selectedLanguage}
											placeholder="Select or type a language..."
										/>
									</div>

									<div>
										<label for="specialNotes" class="mb-2 block text-sm font-medium">
											Special Notes
										</label>
										<textarea
											id="specialNotes"
											name="specialNotes"
											rows="4"
											class="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
											style="background-color: hsl(var(--input));"
											placeholder="Any special requests or notes..."
										></textarea>
									</div>
								</div>

								<div class="mt-6 space-y-3">
									{#if requestedBooksMap[selectedBook.id]}
										<div class="bg-accent mb-3 rounded-md p-3">
											<p class="mb-1 text-sm font-medium">Already requested in:</p>
											<div class="flex flex-wrap gap-2">
												{#each requestedBooksMap[selectedBook.id] as lang}
													<span class="rounded-full bg-purple-600 px-2 py-1 text-xs text-white">
														{lang}
													</span>
												{/each}
											</div>
										</div>
										<Button type="submit" class="w-full">Request in Different Language</Button>
									{:else}
										<Button type="submit" class="w-full">Request Book</Button>
									{/if}

									{#if selectedBook.book_series && selectedBook.book_series.length > 0}
										<Button
											type="button"
											variant="secondary"
											class="w-full"
											onclick={() => {
												// TODO: Implement request whole series
												alert('Request whole series feature coming soon!');
											}}
										>
											Request Whole Series
										</Button>
									{/if}

									<Button
										type="button"
										variant="outline"
										class="w-full"
										onclick={() => {
											selectedBook = null;
										}}
									>
										Cancel
									</Button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</Card>
		</div>
	</button>
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
		>
			<Card class="p-6">
				<div class="mb-6 flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">{selectedSeries.name}</h2>
						<p class="text-muted-foreground text-sm">
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
						<Loader2 class="text-muted-foreground h-8 w-8 animate-spin" />
					</div>
				{:else if sortedSeriesBooks.length === 0}
					<div class="py-12 text-center">
						<BookOpen class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
						<p class="text-muted-foreground">No books found in this series.</p>
					</div>
				{:else}
					<div
						class="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					>
						{#each sortedSeriesBooks as book, index}
							<button
								class="group flex flex-col gap-3 text-left transition-transform hover:scale-105"
								onclick={() => {
									selectedSeries = null;
									seriesBooks = [];
									selectBook(book);
								}}
							>
								<!-- Book cover with aspect ratio and position badge -->
								<div
									class="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg transition-shadow group-hover:shadow-xl"
								>
									{#if book.coverImage}
										<img
											src={book.coverImage}
											alt={book.title}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div class="bg-muted flex h-full w-full items-center justify-center">
											<BookOpen class="text-muted-foreground h-12 w-12" />
										</div>
									{/if}

									<!-- Position badge -->
									{#if book.position !== undefined && book.position !== null}
										<div
											class="absolute top-2 left-2 rounded-md bg-purple-600 px-2 py-1 text-xs font-bold text-white shadow-md"
										>
											#{book.position}
										</div>
									{/if}
								</div>

								<!-- Book info -->
								<div class="flex flex-col gap-1">
									<h4 class="line-clamp-2 text-sm leading-tight font-semibold">
										{book.title}
									</h4>
									<p class="text-muted-foreground line-clamp-1 text-xs">
										{book.author || 'Unknown Author'}
									</p>
									{#if book.publishDate}
										<p class="text-muted-foreground text-xs">
											{new Date(book.publishDate).getFullYear()}
										</p>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</Card>
		</div>
	</button>
{/if}
