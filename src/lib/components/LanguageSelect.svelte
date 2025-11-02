<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		value?: string;
		name?: string;
		id?: string;
		class?: string;
		placeholder?: string;
		required?: boolean;
	}

	let {
		value = $bindable(''),
		name,
		id,
		class: className,
		placeholder = 'Select or type a language...',
		required = false
	}: Props = $props();

	const predefinedLanguages = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese'];

	let showDropdown = $state(false);
	let inputRef: HTMLInputElement;
	let isCustomInput = $state(false);
	let dropdownStyle = $state('');

	function selectLanguage(language: string) {
		value = language;
		showDropdown = false;
		isCustomInput = false;
	}

	function updateDropdownPosition() {
		if (inputRef && showDropdown) {
			const rect = inputRef.getBoundingClientRect();
			dropdownStyle = `position: fixed; top: ${rect.bottom + 4}px; left: ${rect.left}px; width: ${rect.width}px;`;
		}
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		showDropdown = true;
		isCustomInput = true;
	}

	function handleFocus() {
		showDropdown = true;
		updateDropdownPosition();
	}

	function handleBlur() {
		// Delay to allow click on dropdown items
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}

	$effect(() => {
		if (showDropdown) {
			updateDropdownPosition();
		}
	});

	// Filter languages based on input
	const filteredLanguages = $derived(
		isCustomInput && value
			? predefinedLanguages.filter((lang) => lang.toLowerCase().includes(value.toLowerCase()))
			: predefinedLanguages
	);
</script>

<div class="relative">
	<input
		bind:this={inputRef}
		type="text"
		{id}
		{name}
		{required}
		{value}
		{placeholder}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		class={cn(
			'border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		style="background-color: hsl(var(--input));"
		autocomplete="off"
	/>

	{#if showDropdown && filteredLanguages.length > 0}
		<div
			class="border-border bg-card z-[100] rounded-md border shadow-lg"
			style="{dropdownStyle} background-color: hsl(var(--card));"
		>
			<ul class="max-h-48 overflow-y-auto py-1">
				{#each filteredLanguages as language}
					<li>
						<button
							type="button"
							class="hover:bg-accent hover:text-accent-foreground w-full px-3 py-2 text-left text-sm transition-colors"
							onmousedown={(e) => {
								e.preventDefault();
								selectLanguage(language);
							}}
						>
							{language}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
