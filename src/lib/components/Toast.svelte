<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';
	import { fade, fly } from 'svelte/transition';
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';

	let toasts = $state<Toast[]>([]);

	toast.subscribe((value) => {
		toasts = value;
	});

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return CheckCircle;
			case 'error':
				return XCircle;
			case 'warning':
				return AlertTriangle;
			case 'info':
				return Info;
		}
	}

	function getColors(type: Toast['type']) {
		switch (type) {
			case 'success':
				return 'bg-green-600 border-green-700';
			case 'error':
				return 'bg-red-600 border-red-700';
			case 'warning':
				return 'bg-yellow-600 border-yellow-700';
			case 'info':
				return 'bg-blue-600 border-blue-700';
		}
	}
</script>

<div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
	{#each toasts as t (t.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-white shadow-lg {getColors(
				t.type
			)} min-w-[300px] max-w-[500px]"
			transition:fly={{ x: 300, duration: 300 }}
		>
			<svelte:component this={getIcon(t.type)} class="h-5 w-5 flex-shrink-0 mt-0.5" />
			<p class="flex-1 text-sm font-medium">{t.message}</p>
			<button
				onclick={() => toast.dismiss(t.id)}
				class="flex-shrink-0 hover:opacity-70 transition-opacity"
				aria-label="Dismiss"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/each}
</div>

