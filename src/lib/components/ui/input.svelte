<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		type?: string;
		value?: string;
		placeholder?: string;
		class?: string;
		disabled?: boolean;
		name?: string;
		required?: boolean;
		id?: string;
		min?: string | number;
		max?: string | number;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder,
		class: className,
		disabled = false,
		name,
		required = false,
		id,
		min,
		max,
		...restProps
	}: Props = $props();
</script>

<input
	{type}
	{id}
	bind:value
	{placeholder}
	{disabled}
	{name}
	{required}
	{min}
	{max}
	class={cn(
		'border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	style="background-color: hsl(var(--input));"
	{...restProps}
/>
