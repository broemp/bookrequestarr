<script lang="ts">
	interface Book {
		id: string;
		title: string;
		coverImageUrl?: string | null;
		releaseYear?: number | null;
		authors?: string[];
		averageRating?: number | null;
	}

	interface Props {
		book: Book;
		showQuickRequest?: boolean;
		requested?: boolean;
		onQuickRequest?: (book: Book) => void;
		onClick?: (book: Book) => void;
	}

	let {
		book,
		showQuickRequest = false,
		requested = false,
		onQuickRequest,
		onClick
	}: Props = $props();

	function handleClick() {
		onClick?.(book);
	}

	function handleQuickRequest(e: MouseEvent) {
		e.stopPropagation();
		onQuickRequest?.(book);
	}
</script>

<div
	class="group relative cursor-pointer"
	onclick={handleClick}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
>
	<div
		class="overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
	>
		<!-- Cover Image -->
		<div class="relative aspect-[2/3] bg-muted">
			{#if book.coverImageUrl}
				<img src={book.coverImageUrl} alt={book.title} class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center text-muted-foreground">
					<svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
				</div>
			{/if}

			<!-- Requested badge -->
			{#if requested}
				<div
					class="absolute top-2 right-2 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
				>
					Requested
				</div>
			{/if}

			<!-- Quick request button -->
			{#if showQuickRequest && !requested}
				<button
					type="button"
					onclick={handleQuickRequest}
					class="absolute right-2 bottom-2 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
				>
					Request
				</button>
			{/if}

			<!-- Rating badge -->
			{#if book.averageRating}
				<div
					class="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-white"
				>
					<svg class="h-3 w-3 fill-current text-yellow-400" viewBox="0 0 20 20">
						<path
							d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
						/>
					</svg>
					{book.averageRating.toFixed(1)}
				</div>
			{/if}
		</div>

		<!-- Book info - fixed height so all cards in a row match -->
		<div class="p-2">
			<h3 class="mb-0.5 line-clamp-2 h-8 text-xs leading-4 font-semibold text-foreground">
				{book.title}
			</h3>

			<p class="line-clamp-1 text-[11px] leading-4 text-muted-foreground">
				{book.authors && book.authors.length > 0 ? book.authors.join(', ') : '\u00A0'}
			</p>
		</div>
	</div>
</div>
