<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, onclick, ...restProps }: Props = $props();
</script>

<div
	class={cn('rounded-lg border text-card-foreground shadow-sm', className)}
	style="background-color: hsl(var(--card));"
	{onclick}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
