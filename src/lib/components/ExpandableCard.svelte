<script lang="ts">
	interface Props {
		expanded?: boolean;
		children?: import('svelte').Snippet;
		expandedContent?: import('svelte').Snippet;
	}

	let { expanded = $bindable(false), children, expandedContent }: Props = $props();
</script>

<div class="overflow-hidden rounded-lg border border-border transition-all">
	<!-- Main content (always visible) -->
	<div class="p-4">
		{@render children?.()}
	</div>

	<!-- Expanded content (collapsible) -->
	{#if expandedContent}
		<div
			class="overflow-hidden border-t border-border transition-all duration-300 ease-in-out"
			style:max-height={expanded ? '1000px' : '0'}
			style:opacity={expanded ? '1' : '0'}
		>
			<div class="bg-muted/30 p-4">
				{@render expandedContent()}
			</div>
		</div>
	{/if}
</div>
