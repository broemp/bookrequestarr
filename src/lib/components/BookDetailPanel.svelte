<script lang="ts">
	import SlidePanel from './SlidePanel.svelte';
	import LanguageSelect from './LanguageSelect.svelte';
	import { toast } from '$lib/stores/toast';
	import { BookOpen } from 'lucide-svelte';
	import { resolve } from '$app/paths';

	interface Book {
		dbId?: string;
		id: string; // hardcoverId
		title: string;
		subtitle?: string;
		description?: string;
		image?: { url?: string };
		coverImage?: string;
		author?: string;
		contributions?: Array<{ author: { name: string } }>;
		book_series?: Array<{
			series: { id: string; name: string };
			position?: number;
		}>;
		rating?: number;
		ratings_count?: number;
		release_date?: string;
		publishDate?: string;
		pages?: number;
		language?: string;
		publisher?: string;
		isbn?: string;
		taggings?: Array<{ tag: { tag: string } }>;
		slug?: string;
	}

	interface Props {
		bookId: string;
		open?: boolean;
		onClose?: () => void;
		onRequestSubmitted?: () => void;
		onViewSeries?: (seriesId: string, seriesName: string, book: Book) => void;
		defaultLanguage?: string;
		defaultFormat?: 'ebook' | 'audiobook';
	}

	let {
		bookId,
		open = $bindable(false),
		onClose,
		onRequestSubmitted,
		onViewSeries,
		defaultLanguage = 'English',
		defaultFormat = 'ebook'
	}: Props = $props();

	let book: Book | null = $state(null);
	let isLoading = $state(false);
	let selectedLanguage = $state(defaultLanguage);
	let selectedFormat = $state<'ebook' | 'audiobook' | 'both'>(defaultFormat);

	// Load book details when bookId changes
	$effect(() => {
		if (open && bookId) {
			loadBookDetails();
		}
	});

	async function loadBookDetails() {
		isLoading = true;
		try {
			const response = await fetch(`/api/books/${bookId}`);
			if (response.ok) {
				book = await response.json();
			} else {
				toast.show('Failed to load book details', 'error');
				handleClose();
			}
		} catch (error) {
			console.error('Error fetching book details:', error);
			toast.show('Failed to load book details', 'error');
			handleClose();
		} finally {
			isLoading = false;
		}
	}

	function handleClose() {
		open = false;
		book = null;
		selectedLanguage = defaultLanguage;
		selectedFormat = defaultFormat;
		onClose?.();
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!book) return;

		const formData = new FormData(e.currentTarget as HTMLFormElement);
		const formats: ('ebook' | 'audiobook')[] =
			selectedFormat === 'both' ? ['ebook', 'audiobook'] : [selectedFormat];

		try {
			let successCount = 0;
			let errorMessages: string[] = [];

			for (const format of formats) {
				const requestFormData = new FormData();
				requestFormData.set('bookId', book.dbId || '');
				requestFormData.set('hardcoverId', book.id);
				requestFormData.set('language', selectedLanguage);
				requestFormData.set('specialNotes', formData.get('specialNotes') as string);
				requestFormData.set('formatType', format);

				const response = await fetch('/api/requests/create', {
					method: 'POST',
					body: requestFormData
				});

				if (response.ok) {
					successCount++;
				} else {
					const text = await response.text();
					if (response.status === 409) {
						errorMessages.push(`${format}: already requested`);
					} else {
						errorMessages.push(`${format}: ${text || 'failed'}`);
					}
				}
			}

			// Show appropriate toast message
			if (successCount === formats.length) {
				const msg =
					formats.length > 1
						? 'Both formats requested successfully!'
						: 'Book requested successfully!';
				toast.show(msg, 'success');
				handleClose();
				onRequestSubmitted?.();
			} else if (successCount > 0) {
				toast.show(`Partially successful: ${errorMessages.join(', ')}`, 'warning');
				handleClose();
				onRequestSubmitted?.();
			} else {
				toast.show(errorMessages.join(', ') || 'Failed to create request', 'error');
			}
		} catch (error) {
			console.error('Request error:', error);
			toast.show('Failed to create request', 'error');
		}
	}

	function createHardcoverUrl(book: Book): string {
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
			.replace(/^-+|-+$/g, '');

		return `https://hardcover.app/books/${slug}`;
	}
</script>

<SlidePanel bind:open onClose={handleClose}>
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div
					class="border-primary mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
				></div>
				<p class="text-muted-foreground">Loading book details...</p>
			</div>
		</div>
	{:else if book}
		<div class="h-full overflow-y-auto p-8">
			<!-- Two column layout -->
			<div class="flex flex-col gap-8 lg:flex-row">
				<!-- Left side: Book information -->
				<div class="min-w-0 flex-1">
					<!-- Header with cover and main info -->
					<div class="mb-6 flex gap-6">
						{#if book.image?.url || book.coverImage}
							<img
								src={book.image?.url || book.coverImage}
								alt={book.title}
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
							<h2 class="mb-2 text-3xl leading-tight font-bold">{book.title}</h2>
							{#if book.subtitle}
								<p class="text-muted-foreground mb-3 text-lg">{book.subtitle}</p>
							{/if}

							{#if book.contributions && book.contributions.length > 0}
								<p class="text-muted-foreground mb-4 text-base">
									by {book.contributions.map((c) => c.author.name).join(', ')}
								</p>
							{:else if book.author}
								<p class="text-muted-foreground mb-4 text-base">by {book.author}</p>
							{/if}

							<!-- Series information -->
							{#if book.book_series && book.book_series.length > 0}
								<div class="mb-4 flex flex-col items-center gap-1.5">
									{#each book.book_series as series (series.series.id)}
										<button
											type="button"
											class="text-sm font-medium text-purple-400 transition-colors hover:text-purple-300"
											onclick={() =>
												book && onViewSeries?.(series.series.id, series.series.name, book)}
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
								{#if book.rating}
									<div class="flex items-center gap-1.5">
										<span class="font-medium">Rating:</span>
										<span>⭐ {Number(book.rating).toFixed(1)}</span>
										{#if book.ratings_count}
											<span class="text-xs">({book.ratings_count.toLocaleString()} ratings)</span>
										{/if}
									</div>
								{/if}
								{#if book.release_date || book.publishDate}
									<div class="flex items-center gap-1.5">
										<span class="font-medium">Published:</span>
										<span
											>{new Date(
												(book.release_date || book.publishDate) as string
											).getFullYear()}</span
										>
									</div>
								{/if}
								{#if book.pages}
									<div class="flex items-center gap-1.5">
										<span class="font-medium">Pages:</span>
										<span>{book.pages}</span>
									</div>
								{/if}
								{#if book.language}
									<div class="flex items-center gap-1.5">
										<span class="font-medium">Language:</span>
										<span>{book.language}</span>
									</div>
								{/if}
								{#if book.publisher}
									<div class="flex items-center gap-1.5">
										<span class="font-medium">Publisher:</span>
										<span>{book.publisher}</span>
									</div>
								{/if}
								{#if book.isbn}
									<div class="flex items-center gap-1.5">
										<span class="font-medium">ISBN:</span>
										<span>{book.isbn}</span>
									</div>
								{/if}
							</div>

							<!-- Hardcover button -->
							<a
								href={resolve(createHardcoverUrl(book))}
								target="_blank"
								rel="external noopener noreferrer"
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
							{#if book.taggings && book.taggings.length > 0}
								<div class="w-full">
									<h4 class="mb-2 text-center text-sm font-semibold">Genres</h4>
									<div class="flex flex-wrap justify-center gap-2">
										{#each book.taggings.slice(0, 6) as tagging (tagging.tag.tag)}
											<span
												class="rounded-full border border-purple-600/30 bg-purple-600/20 px-3 py-1 text-xs font-medium text-purple-300"
											>
												{tagging.tag.tag}
											</span>
										{/each}
										{#if book.taggings.length > 6}
											<span
												class="rounded-full border border-purple-600/20 bg-purple-600/10 px-3 py-1 text-xs font-medium text-purple-400/60 italic"
											>
												+{book.taggings.length - 6} more
											</span>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Summary section -->
					{#if book.description}
						<div class="border-border border-t pt-6">
							<h3 class="mb-3 text-lg font-semibold">Summary</h3>
							<p class="text-muted-foreground text-sm leading-relaxed">
								{book.description}
							</p>
						</div>
					{/if}
				</div>

				<!-- Right side: Request form -->
				<div
					class="border-border flex w-full flex-shrink-0 flex-col lg:w-[420px] lg:border-l lg:pl-8"
				>
					<h3 class="mb-4 text-xl font-semibold">Request This Book</h3>

					<form onsubmit={handleSubmit} class="flex flex-1 flex-col">
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
								<label for="formatType" class="mb-2 block text-sm font-medium"> Format </label>
								<select
									id="formatType"
									name="formatType"
									bind:value={selectedFormat}
									class="border-input ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
									style="background-color: hsl(var(--input));"
								>
									<option value="ebook">Ebook</option>
									<option value="audiobook">Audiobook</option>
									<option value="both">Both</option>
								</select>
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

						<div class="mt-6 flex gap-3">
							<button
								type="button"
								onclick={handleClose}
								class="border-border hover:bg-muted flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
							>
								Submit Request
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</SlidePanel>
