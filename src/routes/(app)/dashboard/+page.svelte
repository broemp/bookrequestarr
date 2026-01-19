<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import LanguageSelect from '$lib/components/LanguageSelect.svelte';
	import { BookOpen, Clock, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-svelte';
	import { toast } from '$lib/stores/toast';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Modal state
	let selectedBook: any = $state(null);
	let isLoadingBook = $state(false);
	let requestLanguage = $state('English');
	let requestFormat = $state<'ebook' | 'audiobook' | 'both'>('ebook');
	let specialNotes = $state('');

	// Prevent body scroll when modal is open
	$effect(() => {
		if (selectedBook) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	async function selectBook(book: any) {
		selectedBook = book;
		isLoadingBook = true;
		
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

	async function handleRequestBook(e: Event) {
		e.preventDefault();
		if (!selectedBook) return;

		const formats: ('ebook' | 'audiobook')[] =
			requestFormat === 'both' ? ['ebook', 'audiobook'] : [requestFormat];

		try {
			let successCount = 0;
			let errorMessages: string[] = [];

		for (const format of formats) {
			const formData = new FormData();
			formData.append('bookId', selectedBook.dbId);
			if (requestLanguage) formData.append('language', requestLanguage);
			if (specialNotes) formData.append('specialNotes', specialNotes);
			formData.append('formatType', format);

			try {
				const response = await fetch('/api/requests/create', {
					method: 'POST',
					body: formData
				});

				// The API redirects to /requests on success, which will return a 200
				// Check if we got redirected by looking at the final URL
				if (response.ok || response.redirected) {
					successCount++;
				} else {
					const errorText = await response.text();
					if (response.status === 409) {
						errorMessages.push(`${format}: already requested`);
					} else {
						errorMessages.push(`${format}: ${errorText || 'failed'}`);
					}
				}
			} catch (err) {
				console.error(`Error requesting ${format}:`, err);
				errorMessages.push(`${format}: network error`);
			}
		}

			// Show appropriate toast message
			if (successCount === formats.length) {
				const msg =
					formats.length > 1
						? 'Both formats requested successfully!'
						: 'Book requested successfully!';
				toast.show(msg, 'success');
				selectedBook = null;
				requestLanguage = 'English';
				requestFormat = 'ebook';
				specialNotes = '';
				// Reload page to update stats
				window.location.reload();
			} else if (successCount > 0) {
				toast.show(`Partially successful: ${errorMessages.join(', ')}`, 'warning');
				selectedBook = null;
				requestLanguage = 'English';
				requestFormat = 'ebook';
				specialNotes = '';
				window.location.reload();
			} else {
				toast.show(errorMessages.join(', ') || 'Failed to request book', 'error');
			}
		} catch (error) {
			console.error('Error requesting book:', error);
			toast.show('Failed to request book', 'error');
		}
	}

	// Create Hardcover URL slug from book data
	function createHardcoverUrl(book: any): string {
		if (!book) return '#';
		const slug = book.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'book';
		return `https://hardcover.app/books/${slug}-${book.id}`;
	}
</script>

<svelte:head>
	<title>Dashboard - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<!-- Welcome section -->
	<div>
		<h1 class="mb-2 text-3xl font-bold">Welcome back, {data.user.displayName}! 👋</h1>
		<p class="text-muted-foreground">Here's what's happening with your book requests.</p>
	</div>

	<!-- Trending Books -->
	{#if data.trendingBooks.length > 0}
		<div>
			<h2 class="mb-4 text-2xl font-bold">Trending Books</h2>

			<div class="relative -mx-6 px-6">
				<div class="flex gap-3 overflow-x-auto pb-4">
					{#each data.trendingBooks as book}
						<button
							class="group w-32 flex-shrink-0 text-left"
							onclick={() => selectBook(book)}
						>
							<div
								class="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md transition-all group-hover:scale-105 group-hover:shadow-xl"
							>
								{#if book.coverImage}
									<img src={book.coverImage} alt={book.title} class="h-full w-full object-cover" />
								{:else}
									<div class="bg-muted flex h-full w-full items-center justify-center">
										<BookOpen class="text-muted-foreground h-8 w-8" />
									</div>
								{/if}
							</div>

							<div class="mt-2">
								<h3 class="line-clamp-2 text-xs leading-tight font-medium">{book.title}</h3>
								<p class="text-muted-foreground mt-0.5 truncate text-xs">
									{book.author || 'Unknown Author'}
								</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

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

	<!-- Recent Requests -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-2xl font-bold">Recent Requests</h2>
			<Button variant="outline" size="sm">
				<a href="/requests">View All</a>
			</Button>
		</div>

		{#if data.recentRequests.length === 0}
			<Card class="p-8 text-center">
				<div class="text-muted-foreground">
					<BookOpen class="mx-auto mb-3 h-12 w-12 opacity-50" />
					<p>No requests yet. Start by searching for books!</p>
					<Button class="mt-4">
						<a href="/search">Search Books</a>
					</Button>
				</div>
			</Card>
		{:else}
			<div class="relative -mx-6 px-6">
				<div class="flex gap-3 overflow-x-auto pb-4">
					{#each data.recentRequests as request}
						<a href="/requests" class="group relative w-32 flex-shrink-0">
							<div
								class="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md transition-all group-hover:scale-105 group-hover:shadow-xl"
							>
								{#if request.book.coverImage}
									<img
										src={request.book.coverImage}
										alt={request.book.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="bg-muted flex h-full w-full items-center justify-center">
										<BookOpen class="text-muted-foreground h-8 w-8" />
									</div>
								{/if}

								<!-- Status badge overlay -->
								<div class="absolute top-2 right-2">
									<Badge
										variant={request.status === 'pending'
											? 'secondary'
											: request.status === 'approved'
												? 'default'
												: request.status === 'completed'
													? 'default'
													: 'destructive'}
										class="text-xs shadow-lg"
									>
										{request.status}
									</Badge>
								</div>
							</div>

							<div class="mt-2">
								<h3 class="line-clamp-2 text-xs leading-tight font-medium">{request.book.title}</h3>
								<p class="text-muted-foreground mt-0.5 truncate text-xs">
									{request.book.author || 'Unknown Author'}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
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
			class="w-full max-w-6xl"
			onclick={(e: MouseEvent) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<Card class="max-h-[90vh] overflow-y-auto p-0">
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
									<h2 class="mb-2 text-3xl font-bold">{selectedBook.title}</h2>
									<p class="text-muted-foreground mb-4 text-lg">
										{selectedBook.contributions?.[0]?.author?.name || selectedBook.author || 'Unknown Author'}
									</p>

									{#if selectedBook.rating}
										<div class="mb-4 flex items-center gap-2">
											<span class="text-2xl font-bold text-yellow-500">★</span>
											<span class="text-xl font-semibold">
												{selectedBook.rating.toFixed(1)}
											</span>
											{#if selectedBook.rating_count}
												<span class="text-muted-foreground text-sm">
													({selectedBook.rating_count.toLocaleString()} ratings)
												</span>
											{/if}
										</div>
									{/if}

									<!-- Metadata grid -->
									<div class="grid w-full grid-cols-2 gap-3 text-sm">
										{#if selectedBook.release_year || selectedBook.publishDate}
											<div class="bg-muted rounded-lg p-3">
												<p class="text-muted-foreground mb-1 text-xs font-medium">Published</p>
												<p class="font-semibold">
													{selectedBook.release_year || new Date(selectedBook.publishDate).getFullYear()}
												</p>
											</div>
										{/if}

										{#if selectedBook.pages}
											<div class="bg-muted rounded-lg p-3">
												<p class="text-muted-foreground mb-1 text-xs font-medium">Pages</p>
												<p class="font-semibold">{selectedBook.pages}</p>
											</div>
										{/if}

										{#if selectedBook.language}
											<div class="bg-muted rounded-lg p-3">
												<p class="text-muted-foreground mb-1 text-xs font-medium">Language</p>
												<p class="font-semibold">{selectedBook.language}</p>
											</div>
										{/if}

										{#if selectedBook.publisher}
											<div class="bg-muted rounded-lg p-3">
												<p class="text-muted-foreground mb-1 text-xs font-medium">Publisher</p>
												<p class="line-clamp-1 font-semibold">{selectedBook.publisher}</p>
											</div>
										{/if}
									</div>

									<!-- External link -->
									<a
										href={createHardcoverUrl(selectedBook)}
										target="_blank"
										rel="noopener noreferrer"
										class="mt-4 inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 hover:underline"
									>
										View on Hardcover
										<ExternalLink class="h-4 w-4" />
									</a>
								</div>
							</div>

							<!-- Description -->
							{#if selectedBook.description}
								<div class="mb-6">
									<h3 class="mb-2 text-lg font-semibold">Description</h3>
									<p class="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
										{selectedBook.description}
									</p>
								</div>
							{/if}

							<!-- Tags -->
							{#if selectedBook.tags && selectedBook.tags.length > 0}
								<div class="mb-6">
									<h3 class="mb-2 text-lg font-semibold">Tags</h3>
									<div class="flex flex-wrap gap-2">
										{#each selectedBook.tags as tag}
											<Badge variant="secondary">{tag.name}</Badge>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Series information -->
							{#if selectedBook.book_series && selectedBook.book_series.length > 0}
								<div class="mb-6">
									<h3 class="mb-2 text-lg font-semibold">Series</h3>
									<div class="space-y-2">
										{#each selectedBook.book_series as series}
											<div class="bg-muted flex items-center justify-between rounded-lg p-3">
												<div>
													<p class="font-medium">{series.series.name}</p>
													{#if series.position}
														<p class="text-muted-foreground text-sm">Book #{series.position}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<!-- Right side: Request form -->
						<div class="w-full lg:w-80">
							<form onsubmit={handleRequestBook} class="bg-accent sticky top-0 rounded-lg p-6">
								<h3 class="mb-4 text-xl font-bold">Request This Book</h3>

								<div class="space-y-4">
									<div>
										<label for="language" class="mb-2 block text-sm font-medium">
											Preferred Language
										</label>
										<LanguageSelect bind:value={requestLanguage} />
									</div>

								<div>
									<label for="formatType" class="mb-2 block text-sm font-medium">
										Format
									</label>
									<select
										id="formatType"
										name="formatType"
										bind:value={requestFormat}
										class="border-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
										style="background-color: hsl(var(--input));"
									>
										<option value="ebook">Ebook</option>
										<option value="audiobook">Audiobook</option>
										<option value="both">Both</option>
									</select>
								</div>

									<div>
										<label for="notes" class="mb-2 block text-sm font-medium">
											Special Notes (Optional)
										</label>
										<Input
											id="notes"
											bind:value={specialNotes}
											placeholder="Any special requests or notes..."
											class="min-h-[80px]"
										/>
									</div>
								</div>

								<div class="mt-6 space-y-3">
									<Button type="submit" class="w-full">Request Book</Button>

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
