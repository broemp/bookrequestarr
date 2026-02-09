<script lang="ts">
	import Badge from '$lib/components/ui/badge.svelte';
	import { Download, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-svelte';
	import type { DownloadStatus as DownloadStatusType } from '$lib/types/download';
	import { resolve } from '$app/paths';

	let {
		status,
		fileType,
		fileSize,
		errorMessage,
		calibreUrl
	}: {
		status: DownloadStatusType | null;
		fileType?: string;
		fileSize?: number | null;
		errorMessage?: string | null;
		calibreUrl?: string | null;
	} = $props();

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getStatusVariant(
		status: DownloadStatusType | null
	): 'default' | 'secondary' | 'destructive' {
		switch (status) {
			case 'completed':
				return 'default';
			case 'downloading':
			case 'pending':
				return 'secondary';
			case 'failed':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	function getStatusIcon(status: DownloadStatusType | null) {
		switch (status) {
			case 'completed':
				return CheckCircle;
			case 'downloading':
			case 'pending':
				return Loader2;
			case 'failed':
				return AlertCircle;
			default:
				return Download;
		}
	}

	function getStatusText(status: DownloadStatusType | null): string {
		switch (status) {
			case 'completed':
				return 'Downloaded';
			case 'downloading':
				return 'Downloading';
			case 'pending':
				return 'Pending';
			case 'failed':
				return 'Failed';
			default:
				return 'Not Downloaded';
		}
	}

	// Get the icon component for dynamic rendering (Svelte 5 runes mode)
	let StatusIcon = $derived(getStatusIcon(status));
</script>

<div class="flex items-center gap-2">
	<Badge variant={getStatusVariant(status)}>
		<StatusIcon class="mr-1 h-3 w-3 {status === 'downloading' ? 'animate-spin' : ''}" />
		{getStatusText(status)}
	</Badge>

	{#if status === 'completed' && fileType}
		<Badge variant="secondary">{fileType.toUpperCase()}</Badge>
	{/if}

	{#if status === 'completed' && fileSize != null}
		<span class="text-xs text-muted-foreground">{formatFileSize(fileSize)}</span>
	{/if}

	{#if status === 'completed' && calibreUrl}
		<a
			href={resolve(calibreUrl)}
			target="_blank"
			rel="external noopener noreferrer"
			class="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
		>
			<ExternalLink class="h-3 w-3" />
			Search in Calibre-Web
		</a>
	{/if}

	{#if status === 'failed' && errorMessage}
		<span class="text-xs text-destructive" title={errorMessage}>
			{errorMessage.substring(0, 50)}{errorMessage.length > 50 ? '...' : ''}
		</span>
	{/if}
</div>
