<script lang="ts">
	import ErrorDisplay from './ErrorDisplay.svelte';
	import DownloadStatus from './DownloadStatus.svelte';

	interface Request {
		id: string;
		bookTitle: string;
		bookAuthor?: string;
		bookCoverUrl?: string;
		language: string;
		formatType: 'ebook' | 'audiobook';
		status: string;
		specialNotes?: string;
		userName?: string;
		createdAt: string;
		download?: {
			id: string;
			status: string;
			errorMessage?: string;
			source?: string;
			fileName?: string;
			fileFormat?: string;
			fileSize?: number;
			progress?: number;
		};
	}

	interface Props {
		request: Request;
		showActions?: boolean;
		showUserInfo?: boolean;
		onApprove?: (request: Request) => void;
		onReject?: (request: Request) => void;
		onRetry?: (request: Request) => void;
		onDownload?: (request: Request) => void;
	}

	let {
		request,
		showActions = false,
		showUserInfo = false,
		onApprove,
		onReject,
		onRetry,
		onDownload
	}: Props = $props();

	const statusColors = {
		pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
		approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
		completed: 'bg-green-500/10 text-green-500 border-green-500/20',
		rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
		download_problem: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
	};

	const statusLabels = {
		pending: 'Pending',
		approved: 'Approved',
		completed: 'Completed',
		rejected: 'Rejected',
		download_problem: 'Download Problem'
	};

	function getTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (seconds < 60) return 'just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
		return date.toLocaleDateString();
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
</script>

<div class="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors">
	<div class="flex gap-4">
		<!-- Book Cover -->
		<div class="flex-shrink-0">
			{#if request.bookCoverUrl}
				<img
					src={request.bookCoverUrl}
					alt={request.bookTitle}
					class="w-20 h-28 object-cover rounded-md shadow-sm"
				/>
			{:else}
				<div class="w-20 h-28 bg-muted rounded-md flex items-center justify-center">
					<svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
				</div>
			{/if}
		</div>

		<!-- Request Details -->
		<div class="flex-1 min-w-0">
			<!-- Title and Author -->
			<h3 class="text-lg font-semibold text-foreground mb-1 line-clamp-2">
				{request.bookTitle}
			</h3>
			{#if request.bookAuthor}
				<p class="text-sm text-muted-foreground mb-2">by {request.bookAuthor}</p>
			{/if}

			<!-- Meta info -->
			<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
				{#if showUserInfo && request.userName}
					<span>Requested by {request.userName}</span>
				{/if}
				<span>{getTimeAgo(request.createdAt)}</span>
				<span>Language: {request.language}</span>
				<span>Format: {request.formatType === 'ebook' ? 'Ebook' : 'Audiobook'}</span>
			</div>

			<!-- Status Badge -->
			<div class="mb-3">
				<span
					class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border {statusColors[
						request.status as keyof typeof statusColors
					] || statusColors.pending}"
				>
					{statusLabels[request.status as keyof typeof statusLabels] || request.status}
				</span>
			</div>

			<!-- Special Notes -->
			{#if request.specialNotes}
				<div class="mb-3 p-3 bg-muted/50 rounded-md">
					<p class="text-sm text-muted-foreground">
						<span class="font-medium text-foreground">Notes:</span>
						{request.specialNotes}
					</p>
				</div>
			{/if}

			<!-- Download Status/Progress -->
			{#if request.download}
				<div class="mb-3">
					{#if request.download.status === 'completed' && request.download.fileName}
						<div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="font-medium">Downloaded:</span>
							<span>
								{request.download.fileFormat?.toUpperCase() || 'Unknown'}
								{#if request.download.fileSize}
									, {formatFileSize(request.download.fileSize)}
								{/if}
							</span>
						</div>
					{:else if request.download.status === 'downloading' || request.download.status === 'in_progress'}
						<div class="space-y-2">
							<div class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
								<div
									class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
								></div>
								<span class="font-medium">In Progress</span>
								{#if request.download.progress}
									<span>({request.download.progress}%)</span>
								{/if}
							</div>
							{#if request.download.progress}
								<div class="w-full bg-muted rounded-full h-2">
									<div
										class="bg-blue-600 h-2 rounded-full transition-all duration-300"
										style="width: {request.download.progress}%"
									></div>
								</div>
							{/if}
						</div>
					{:else if request.download.status === 'failed' && request.download.errorMessage}
						<ErrorDisplay
							error={request.download.errorMessage}
							severity="error"
							actions={[]}
						/>
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			{#if showActions}
				<div class="flex flex-wrap gap-2 mt-4">
					{#if request.status === 'pending' && onApprove && onReject}
						<button
							type="button"
							onclick={() => onApprove(request)}
							class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
						>
							Approve
						</button>
						<button
							type="button"
							onclick={() => onReject(request)}
							class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
						>
							Reject
						</button>
					{/if}

					{#if request.status === 'approved' && onDownload}
						<button
							type="button"
							onclick={() => onDownload(request)}
							class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
						>
							Download
						</button>
					{/if}

					{#if request.status === 'download_problem' && onRetry}
						<button
							type="button"
							onclick={() => onRetry(request)}
							class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
						>
							Retry Download
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
