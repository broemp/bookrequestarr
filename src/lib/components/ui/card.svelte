<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div
	class={cn('text-card-foreground rounded-lg border shadow-sm', className)}
	style="background-color: hsl(var(--card));"
>
	{#if children}
		{@render children()}
	{/if}
</div>
