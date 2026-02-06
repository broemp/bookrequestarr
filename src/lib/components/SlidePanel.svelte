<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Props {
		open?: boolean;
		width?: string;
		position?: 'right' | 'bottom';
		onClose?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		open = $bindable(false),
		width = '40%',
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
	let actualPosition = $derived(
		browser && window.innerWidth < 768 ? 'bottom' : position
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
		class:opacity-100={open}
		class:opacity-0={!open}
		onclick={handleBackdropClick}
		role="presentation"
	></div>

	<!-- Panel -->
	<div
		bind:this={panelElement}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		class="fixed bg-background border-l border-border z-50 overflow-y-auto transition-transform duration-300 ease-out"
		class:slide-right={actualPosition === 'right'}
		class:slide-bottom={actualPosition === 'bottom'}
		style:width={actualPosition === 'right' ? width : '100%'}
		style:height={actualPosition === 'bottom' ? '85vh' : '100vh'}
	>
		<!-- Close button -->
		<button
			onclick={close}
			class="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors z-10"
			aria-label="Close panel"
		>
			<svg
				class="w-5 h-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
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
		transform: translateX(0);
	}

	.slide-right:not(.open) {
		transform: translateX(100%);
	}

	.slide-bottom {
		bottom: 0;
		left: 0;
		right: 0;
		border-radius: 1rem 1rem 0 0;
		border-left: none;
		border-top: 1px solid hsl(var(--border));
		transform: translateY(0);
	}

	.slide-bottom:not(.open) {
		transform: translateY(100%);
	}
</style>
