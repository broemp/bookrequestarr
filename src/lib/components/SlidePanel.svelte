<script lang="ts">
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';

	interface Props {
		open?: boolean;
		width?: string;
		position?: 'right' | 'bottom';
		onClose?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		open = $bindable(false),
		width = '35%',
		position = 'right',
		onClose,
		children
	}: Props = $props();

	let panelElement: HTMLDivElement | null = $state(null);
	let previouslyFocused: HTMLElement | null = null;

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			close();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	function close() {
		open = false;
		onClose?.();
	}

	// Manage focus trap and body scroll
	$effect(() => {
		if (!browser) return;

		if (open) {
			// Store previously focused element
			previouslyFocused = document.activeElement as HTMLElement;

			// Prevent body scroll
			document.body.style.overflow = 'hidden';

			// Focus panel
			setTimeout(() => {
				panelElement?.focus();
			}, 100);
		} else {
			// Restore body scroll
			document.body.style.overflow = '';

			// Restore focus
			if (previouslyFocused) {
				previouslyFocused.focus();
			}
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	// Responsive position
	let actualPosition = $derived(browser && window.innerWidth < 768 ? 'bottom' : position);

	// Transition parameters based on position
	let transitionParams = $derived(
		actualPosition === 'right' ? { x: 400, duration: 300 } : { y: 400, duration: 300 }
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
		onclick={handleBackdropClick}
		role="presentation"
	></div>

	<!-- Panel -->
	<div
		bind:this={panelElement}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		class="fixed z-50 overflow-y-auto border-l border-border bg-background"
		class:slide-right={actualPosition === 'right'}
		class:slide-bottom={actualPosition === 'bottom'}
		style:width={actualPosition === 'right' ? width : '100%'}
		style:height={actualPosition === 'bottom' ? '85vh' : '100vh'}
		transition:fly={transitionParams}
	>
		<!-- Close button -->
		<button
			onclick={close}
			class="absolute top-4 right-4 z-10 rounded-lg p-2 transition-colors hover:bg-muted"
			aria-label="Close panel"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>

		<!-- Content -->
		<div class="h-full">
			{@render children?.()}
		</div>
	</div>
{/if}

<style>
	.slide-right {
		top: 0;
		right: 0;
		bottom: 0;
	}

	.slide-bottom {
		bottom: 0;
		left: 0;
		right: 0;
		border-radius: 1rem 1rem 0 0;
		border-left: none;
		border-top: 1px solid hsl(var(--border));
	}
</style>
