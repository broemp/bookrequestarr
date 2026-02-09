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
					class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<p class="text-muted-foreground">Loading book details...</p>
			</div>
		</div>
	{:else if book}
		<div class="h-full overflow-y-auto p-6">
			<div class="flex flex-col gap-6">
				<!-- Top section: stacked on mobile, side-by-side on desktop -->
				<div class="flex flex-col gap-6 md:flex-row">
					<!-- Book info: cover centered, then info stacked below -->
					<div class="flex min-w-0 flex-1 flex-col items-center text-center">
						{#if book.image?.url || book.coverImage}
							<img
								src={book.image?.url || book.coverImage}
								alt={book.title}
								class="mb-4 h-52 w-36 rounded-lg object-cover shadow-xl md:h-56 md:w-40"
							/>
						{:else}
							<div
								class="mb-4 flex h-52 w-36 items-center justify-center rounded-lg bg-muted md:h-56 md:w-40"
							>
								<BookOpen class="h-12 w-12 text-muted-foreground md:h-14 md:w-14" />
							</div>
						{/if}

						<h2 class="mb-1 text-xl leading-tight font-bold">{book.title}</h2>
						{#if book.subtitle}
							<p class="mb-2 text-sm text-muted-foreground">{book.subtitle}</p>
						{/if}

						{#if book.contributions && book.contributions.length > 0}
							<p class="mb-3 text-sm text-muted-foreground">
								by {book.contributions.map((c) => c.author.name).join(', ')}
							</p>
						{:else if book.author}
							<p class="mb-3 text-sm text-muted-foreground">by {book.author}</p>
						{/if}

						{#if book.book_series && book.book_series.length > 0}
							<div class="mb-3 flex flex-col items-center gap-1">
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

						<!-- Metadata -->
						<div class="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
							{#if book.rating}
								<span>⭐ {Number(book.rating).toFixed(1)}{#if book.ratings_count} ({book.ratings_count.toLocaleString()}){/if}</span>
							{/if}
							{#if book.release_date || book.publishDate}
								<span>{new Date((book.release_date || book.publishDate) as string).getFullYear()}</span>
							{/if}
							{#if book.pages}
								<span>{book.pages} pages</span>
							{/if}
							{#if book.language}
								<span>{book.language}</span>
							{/if}
						</div>

						<!-- Hardcover link -->
						<a
							href={resolve(createHardcoverUrl(book))}
							target="_blank"
							rel="external noopener noreferrer"
							class="inline-flex items-center gap-1.5 text-sm font-medium text-purple-400 transition-colors hover:text-purple-300"
						>
							<span>View on Hardcover</span>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
						</a>
					</div>

					<!-- Request form: full width on mobile, sidebar on desktop -->
					<div class="flex flex-col border-t border-border pt-4 md:w-48 md:flex-shrink-0 md:border-t-0 md:border-l md:pt-0 md:pl-5">
						<h3 class="mb-3 text-lg font-semibold md:text-sm">Request This Book</h3>

						<form onsubmit={handleSubmit} class="flex flex-1 flex-col gap-3">
							<div>
								<label for="language" class="mb-1 block text-sm font-medium md:text-xs">
									Language
								</label>
								<LanguageSelect
									id="language"
									name="language"
									bind:value={selectedLanguage}
									placeholder="Language..."
								/>
							</div>

							<div>
								<label for="formatType" class="mb-1 block text-sm font-medium md:text-xs">Format</label>
								<select
									id="formatType"
									name="formatType"
									bind:value={selectedFormat}
									class="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none md:h-9 md:px-2.5 md:py-1.5"
									style="background-color: hsl(var(--input));"
								>
									<option value="ebook">Ebook</option>
									<option value="audiobook">Audiobook</option>
									<option value="both">Both</option>
								</select>
							</div>

							<div>
								<label for="specialNotes" class="mb-1 block text-sm font-medium md:text-xs">
									Notes
								</label>
								<textarea
									id="specialNotes"
									name="specialNotes"
									rows="2"
									class="flex w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none md:px-2.5 md:py-1.5"
									style="background-color: hsl(var(--input));"
									placeholder="Special notes..."
								></textarea>
							</div>

							<div class="flex gap-3 pt-2 md:mt-auto md:flex-col md:gap-2">
								<button
									type="submit"
									class="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:flex-none md:w-full"
								>
									Submit Request
								</button>
								<button
									type="button"
									onclick={handleClose}
									class="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted md:flex-none md:w-full"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>

				<!-- Genres (full width below) -->
				{#if book.taggings && book.taggings.length > 0}
					<div class="flex flex-wrap gap-1.5">
						{#each book.taggings.slice(0, 6) as tagging, i (i)}
							<span
								class="rounded-full border border-purple-600/30 bg-purple-600/20 px-2.5 py-0.5 text-xs font-medium text-purple-300"
							>
								{tagging.tag.tag}
							</span>
						{/each}
						{#if book.taggings.length > 6}
							<span
								class="rounded-full border border-purple-600/20 bg-purple-600/10 px-2.5 py-0.5 text-xs font-medium text-purple-400/60 italic"
							>
								+{book.taggings.length - 6} more
							</span>
						{/if}
					</div>
				{/if}

				<!-- Summary -->
				{#if book.description}
					<div class="border-t border-border pt-4">
						<h3 class="mb-2 text-sm font-semibold">Summary</h3>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{book.description}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</SlidePanel>
