<script lang="ts">
	interface Props {
		expanded?: boolean;
		title?: string;
		children?: import('svelte').Snippet;
		expandedContent?: import('svelte').Snippet;
	}

	let { expanded = $bindable(false), title, children, expandedContent }: Props = $props();

	function toggle() {
		expanded = !expanded;
	}
</script>

<div class="border border-border rounded-lg overflow-hidden transition-all">
	<!-- Main content (always visible) -->
	<div class="p-4">
		{@render children?.()}
	</div>

	<!-- Expanded content (collapsible) -->
	{#if expandedContent}
		<div
			class="border-t border-border transition-all duration-300 ease-in-out overflow-hidden"
			style:max-height={expanded ? '1000px' : '0'}
			style:opacity={expanded ? '1' : '0'}
		>
			<div class="p-4 bg-muted/30">
				{@render expandedContent()}
			</div>
		</div>
	{/if}
</div>
