<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		class?: string;
		children?: Snippet;
		onclick?: () => void;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className,
		children,
		onclick,
		type = 'button',
		disabled = false,
		...restProps
	}: Props = $props();

	const variants = {
		default: 'text-primary-foreground hover:opacity-90',
		destructive: 'text-destructive-foreground hover:opacity-90',
		outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
		secondary: 'text-secondary-foreground hover:opacity-80',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		link: 'text-primary underline-offset-4 hover:underline'
	};

	const variantStyles = {
		default: 'background-color: hsl(var(--primary));',
		destructive: 'background-color: hsl(var(--destructive));',
		outline: 'background-color: transparent;',
		secondary: 'background-color: hsl(var(--secondary));',
		ghost: '',
		link: ''
	};

	const sizes = {
		default: 'h-10 px-4 py-2',
		sm: 'h-9 rounded-md px-3',
		lg: 'h-11 rounded-md px-8',
		icon: 'h-10 w-10'
	};
</script>

<button
	{type}
	{disabled}
	class={cn(
		'inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
		variants[variant],
		sizes[size],
		className
	)}
	style={variantStyles[variant]}
	{onclick}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</button>
