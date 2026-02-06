<script lang="ts">
	interface Action {
		label: string;
		onClick: () => void;
		variant?: 'primary' | 'secondary' | 'destructive';
	}

	interface Props {
		error: string;
		severity?: 'error' | 'warning' | 'info';
		actions?: Action[];
		attemptedSteps?: string[];
	}

	let { error, severity = 'error', actions = [], attemptedSteps = [] }: Props = $props();

	const icons = {
		error: '❌',
		warning: '⚠️',
		info: 'ℹ️'
	};

	const colors = {
		error: 'border-red-500/50 bg-red-500/10',
		warning: 'border-yellow-500/50 bg-yellow-500/10',
		info: 'border-blue-500/50 bg-blue-500/10'
	};

	// Categorize error type based on content
	let errorIcon = $derived(() => {
		const lowerError = error.toLowerCase();
		if (lowerError.includes('http 404') || lowerError.includes('not found')) return '🔍';
		if (lowerError.includes('http 403') || lowerError.includes('forbidden')) return '🚫';
		if (lowerError.includes('network') || lowerError.includes('timeout')) return '📡';
		if (lowerError.includes('invalid') || lowerError.includes('format')) return '⚠️';
		return icons[severity];
	});
</script>

<div class="rounded-lg border {colors[severity]} p-4">
	<div class="flex items-start gap-3">
		<div class="mt-0.5 flex-shrink-0 text-2xl">
			{errorIcon()}
		</div>

		<div class="min-w-0 flex-1">
			<!-- Error title -->
			<h4 class="text-foreground mb-2 font-semibold">
				{#if severity === 'error'}
					Error Details
				{:else if severity === 'warning'}
					Warning
				{:else}
					Information
				{/if}
			</h4>

			<!-- Error message -->
			<p class="text-muted-foreground text-sm break-words whitespace-pre-wrap">
				{error}
			</p>

			<!-- Attempted steps (if any) -->
			{#if attemptedSteps.length > 0}
				<div class="border-border/50 mt-3 border-t pt-3">
					<p class="text-foreground mb-2 text-sm font-medium">Attempted:</p>
					<ul class="space-y-1">
						{#each attemptedSteps as step}
							<li class="text-muted-foreground flex items-start gap-2 text-sm">
								<span class="mt-1">•</span>
								<span>{step}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Actions -->
			{#if actions.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each actions as action}
						<button
							type="button"
							onclick={action.onClick}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {action.variant ===
							'primary'
								? 'bg-primary text-primary-foreground hover:bg-primary/90'
								: action.variant === 'destructive'
									? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
									: 'bg-muted text-foreground hover:bg-muted/80'}"
						>
							{action.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
