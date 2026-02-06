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

	let isHovered = $state(false);

	function handleClick() {
		onClick?.(book);
	}

	function handleQuickRequest(e: MouseEvent) {
		e.stopPropagation();
		onQuickRequest?.(book);
	}
</script>

<div
	class="relative group cursor-pointer"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
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
	<div class="bg-card border border-border rounded-lg overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
		<!-- Cover Image -->
		<div class="relative aspect-[2/3] bg-muted">
			{#if book.coverImageUrl}
				<img
					src={book.coverImageUrl}
					alt={book.title}
					class="w-full h-full object-cover"
				/>
			{:else}
				<div class="w-full h-full flex items-center justify-center text-muted-foreground">
					<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				<div class="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-semibold">
					Requested
				</div>
			{/if}

			<!-- Quick request overlay (desktop only) -->
			{#if showQuickRequest && !requested && isHovered}
				<div class="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity">
					<button
						type="button"
						onclick={handleQuickRequest}
						class="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
					>
						Quick Request
					</button>
				</div>
			{/if}

			<!-- Rating badge -->
			{#if book.averageRating}
				<div class="absolute bottom-2 left-2 bg-black/75 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
					<svg class="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
						<path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
					</svg>
					{book.averageRating.toFixed(1)}
				</div>
			{/if}
		</div>

		<!-- Book info -->
		<div class="p-3">
			<h3 class="font-semibold text-sm line-clamp-2 text-foreground mb-1">
				{book.title}
			</h3>

			{#if book.authors && book.authors.length > 0}
				<p class="text-xs text-muted-foreground line-clamp-1 mb-1">
					{book.authors.join(', ')}
				</p>
			{/if}

			{#if book.releaseYear}
				<p class="text-xs text-muted-foreground">
					{book.releaseYear}
				</p>
			{/if}
		</div>
	</div>
</div>
