<script lang="ts">
	import type { PageData } from './$types';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import DownloadStatus from '$lib/components/DownloadStatus.svelte';
	import FileSelectionModal from '$lib/components/FileSelectionModal.svelte';
	import { BookOpen, Download, RefreshCw, Book, Headphones, Check, X } from 'lucide-svelte';
	import { formatDistance } from 'date-fns';
	import { enhance } from '$app/forms';
	import type { AnnasArchiveSearchResult } from '$lib/types/download';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state<string>('active');
	let showFileSelection = $state(false);
	let selectedRequestId = $state<string | null>(null);
	let availableFiles = $state<AnnasArchiveSearchResult[]>([]);
	let downloadingRequests = $state<Set<string>>(new Set());

	const filteredRequests = $derived(
		statusFilter === 'all'
			? data.requests
			: statusFilter === 'active'
				? data.requests.filter((r) => r.status === 'pending' || r.status === 'approved')
				: data.requests.filter((r) => r.status === statusFilter)
	);

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
			case 'approved':
				return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
			case 'completed':
				return 'bg-green-500/10 text-green-600 dark:text-green-400';
			case 'rejected':
				return 'bg-red-500/10 text-red-600 dark:text-red-400';
			case 'download_problem':
				return 'bg-red-500/10 text-red-600 dark:text-red-400';
			default:
				return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
		}
	}

	async function initiateDownload(requestId: string) {
		downloadingRequests.add(requestId);
		downloadingRequests = downloadingRequests;

		try {
			const response = await fetch('/api/downloads/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestId })
			});

		const result = await response.json();

		if (result.requiresSelection) {
			// Show file selection modal with Anna's Archive results (prioritize these)
			selectedRequestId = requestId;
			availableFiles = result.annasArchiveResults || result.prowlarrResults || [];
			showFileSelection = true;
		} else if (!result.success) {
			alert(`Download failed: ${result.error || 'Unknown error'}`);
		} else {
			// Refresh page to show updated status
			window.location.reload();
		}
		} catch (error) {
			console.error('Error initiating download:', error);
			alert('Failed to initiate download');
		} finally {
			downloadingRequests.delete(requestId);
			downloadingRequests = downloadingRequests;
		}
	}

	async function handleFileSelection(file: AnnasArchiveSearchResult) {
		if (!selectedRequestId) return;

		downloadingRequests.add(selectedRequestId);
		downloadingRequests = downloadingRequests;

		try {
			const response = await fetch('/api/downloads/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requestId: selectedRequestId,
					md5: file.md5,
					fileType: file.extension,
					manual: true
				})
			});

			const result = await response.json();

			if (!result.success) {
				alert(`Download failed: ${result.error}`);
			} else {
				// Refresh page to show updated status
				window.location.reload();
			}
		} catch (error) {
			console.error('Error initiating download:', error);
			alert('Failed to initiate download');
		} finally {
			downloadingRequests.delete(selectedRequestId);
			downloadingRequests = downloadingRequests;
			selectedRequestId = null;
		}
	}

	async function retryDownload(downloadId: string, requestId: string) {
		downloadingRequests.add(requestId);
		downloadingRequests = downloadingRequests;

		try {
			const response = await fetch(`/api/downloads/retry/${downloadId}`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!result.success) {
				alert(`Retry failed: ${result.error}`);
			} else {
				// Refresh page to show updated status
				window.location.reload();
			}
		} catch (error) {
			console.error('Error retrying download:', error);
			alert('Failed to retry download');
		} finally {
			downloadingRequests.delete(requestId);
			downloadingRequests = downloadingRequests;
		}
	}
</script>

<svelte:head>
	<title>Admin: Requests - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Manage Requests</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				{filteredRequests.length}
				{filteredRequests.length === 1 ? 'request' : 'requests'}
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="border-b">
		<div class="flex gap-1">
			<button
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter ===
				'active'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					statusFilter = 'active';
				}}
			>
				Active ({data.requests.filter((r) => r.status === 'pending' || r.status === 'approved')
					.length})
			</button>
			<button
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter ===
				'pending'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					statusFilter = 'pending';
				}}
			>
				Pending ({data.requests.filter((r) => r.status === 'pending').length})
			</button>
			<button
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter ===
				'approved'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					statusFilter = 'approved';
				}}
			>
				Approved ({data.requests.filter((r) => r.status === 'approved').length})
			</button>
			<button
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter ===
				'completed'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					statusFilter = 'completed';
				}}
			>
				Completed ({data.requests.filter((r) => r.status === 'completed').length})
			</button>
			<button
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter ===
				'rejected'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					statusFilter = 'rejected';
				}}
			>
				Rejected ({data.requests.filter((r) => r.status === 'rejected').length})
			</button>
			<button
				class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter === 'all'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					statusFilter = 'all';
				}}
			>
				All ({data.requests.length})
			</button>
		</div>
	</div>

	<!-- Requests list -->
	{#if filteredRequests.length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<BookOpen class="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
			<p class="text-muted-foreground">
				{statusFilter === 'all'
					? 'No requests yet'
					: statusFilter === 'active'
						? 'No active requests'
						: `No ${statusFilter} requests`}
			</p>
		</div>
	{:else}
		<div class="border rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-muted/50 border-b text-sm">
					<tr>
						<th class="px-4 py-3 text-left font-medium">Book</th>
						<th class="px-4 py-3 text-left font-medium">Requested By</th>
						<th class="px-4 py-3 text-left font-medium">Status</th>
						<th class="px-4 py-3 text-left font-medium">Type</th>
						<th class="px-4 py-3 text-left font-medium">Date</th>
						<th class="px-4 py-3 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each filteredRequests as request}
						<tr class="hover:bg-muted/30 transition-colors">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									{#if request.book.coverImage}
										<img
											src={request.book.coverImage}
											alt={request.book.title}
											class="h-16 w-11 rounded object-cover flex-shrink-0"
										/>
									{:else}
										<div class="bg-muted flex h-16 w-11 items-center justify-center rounded flex-shrink-0">
											<BookOpen class="text-muted-foreground h-5 w-5" />
										</div>
									{/if}
									<div class="min-w-0">
										<p class="font-medium truncate">{request.book.title}</p>
										<p class="text-muted-foreground text-sm truncate">
											{request.book.author || 'Unknown Author'}
										</p>
										{#if request.specialNotes}
											<p class="text-muted-foreground text-xs mt-1 truncate italic">
												"{request.specialNotes}"
											</p>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-4 py-3">
								<p class="text-sm">{request.user.displayName}</p>
								{#if request.language}
									<p class="text-muted-foreground text-xs mt-0.5">{request.language}</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								<span
									class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium {getStatusColor(
										request.status
									)}"
								>
									{request.status}
								</span>
								{#if request.download && data.annasArchiveEnabled}
									<div class="mt-1">
										<DownloadStatus
											status={request.download.downloadStatus}
											fileType={request.download.fileType}
											fileSize={request.download.fileSize}
											errorMessage={request.download.errorMessage}
											calibreUrl={data.calibreBaseUrl &&
											request.download.downloadStatus === 'completed'
												? `${data.calibreBaseUrl}/search?query=${encodeURIComponent(
														`${request.book.title} ${request.book.author || ''}`
													)}`
												: null}
										/>
									</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<span class="text-muted-foreground flex items-center gap-1.5 text-sm">
									{#if request.formatType === 'audiobook'}
										<Headphones class="h-4 w-4" />
										<span>Audio</span>
									{:else}
										<Book class="h-4 w-4" />
										<span>Ebook</span>
									{/if}
								</span>
							</td>
							<td class="px-4 py-3">
								<p class="text-muted-foreground text-sm">
									{formatDistance(new Date(request.createdAt), new Date(), {
										addSuffix: true
									})}
								</p>
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center justify-end gap-2">
									{#if request.status === 'pending'}
										<form method="POST" action="?/updateStatus" use:enhance class="inline">
											<input type="hidden" name="requestId" value={request.id} />
											<input type="hidden" name="status" value="approved" />
											<Button type="submit" size="sm" class="h-8">
												<Check class="h-4 w-4" />
											</Button>
										</form>

										<form method="POST" action="?/updateStatus" use:enhance class="inline">
											<input type="hidden" name="requestId" value={request.id} />
											<input type="hidden" name="status" value="rejected" />
											<Button type="submit" size="sm" variant="destructive" class="h-8">
												<X class="h-4 w-4" />
											</Button>
										</form>
									{:else if request.status === 'approved'}
										{#if data.annasArchiveEnabled && !request.download}
											<Button
												size="sm"
												onclick={() => initiateDownload(request.id)}
												disabled={downloadingRequests.has(request.id)}
												class="h-8"
											>
												<Download class="h-4 w-4 mr-1" />
												{downloadingRequests.has(request.id) ? 'Downloading...' : 'Download'}
											</Button>
										{/if}

										<form method="POST" action="?/updateStatus" use:enhance class="inline">
											<input type="hidden" name="requestId" value={request.id} />
											<input type="hidden" name="status" value="completed" />
											<Button type="submit" size="sm" variant="outline" class="h-8">
												Complete
											</Button>
										</form>
									{:else if request.status === 'download_problem'}
										{#if data.annasArchiveEnabled && request.download}
											<Button
												size="sm"
												onclick={() => retryDownload(request.download.id, request.id)}
												disabled={downloadingRequests.has(request.id)}
												class="h-8"
											>
												<RefreshCw class="h-4 w-4 mr-1" />
												{downloadingRequests.has(request.id) ? 'Retrying...' : 'Retry'}
											</Button>
										{/if}
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<FileSelectionModal
	bind:isOpen={showFileSelection}
	results={availableFiles}
	onSelect={handleFileSelection}
/>
