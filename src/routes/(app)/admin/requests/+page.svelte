<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import DownloadStatus from '$lib/components/DownloadStatus.svelte';
	import FileSelectionModal from '$lib/components/FileSelectionModal.svelte';
	import { BookOpen, User, Calendar, MessageSquare, Download, RefreshCw } from 'lucide-svelte';
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

	function getStatusVariant(status: string) {
		switch (status) {
			case 'pending':
				return 'secondary';
			case 'approved':
				return 'default';
			case 'completed':
				return 'default';
			case 'rejected':
				return 'destructive';
			case 'download_problem':
				return 'destructive';
			default:
				return 'secondary';
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

			if (result.requiresSelection && result.results) {
				// Show file selection modal
				selectedRequestId = requestId;
				availableFiles = result.results;
				showFileSelection = true;
			} else if (!result.success) {
				alert(`Download failed: ${result.error}`);
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
	<div>
		<h1 class="mb-2 text-3xl font-bold">Manage Requests</h1>
		<p class="text-muted-foreground">Review and manage all book requests</p>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-2">
		<Button
			variant={statusFilter === 'active' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'active';
			}}
		>
			Active ({data.requests.filter((r) => r.status === 'pending' || r.status === 'approved')
				.length})
		</Button>
		<Button
			variant={statusFilter === 'pending' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'pending';
			}}
		>
			Pending ({data.requests.filter((r) => r.status === 'pending').length})
		</Button>
		<Button
			variant={statusFilter === 'approved' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'approved';
			}}
		>
			Approved ({data.requests.filter((r) => r.status === 'approved').length})
		</Button>
		<Button
			variant={statusFilter === 'completed' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'completed';
			}}
		>
			Completed ({data.requests.filter((r) => r.status === 'completed').length})
		</Button>
		<Button
			variant={statusFilter === 'rejected' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'rejected';
			}}
		>
			Rejected ({data.requests.filter((r) => r.status === 'rejected').length})
		</Button>
		<Button
			variant={statusFilter === 'all' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'all';
			}}
		>
			All ({data.requests.length})
		</Button>
	</div>

	<!-- Requests list -->
	{#if filteredRequests.length === 0}
		<Card class="p-12 text-center">
			<BookOpen class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
			<p class="text-muted-foreground">
				{statusFilter === 'all'
					? 'No requests yet'
					: statusFilter === 'active'
						? 'No active requests'
						: `No ${statusFilter} requests`}
			</p>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredRequests as request}
				<Card class="p-4">
					<div class="flex gap-4">
						{#if request.book.coverImage}
							<img
								src={request.book.coverImage}
								alt={request.book.title}
								class="h-24 w-16 rounded object-cover"
							/>
						{:else}
							<div class="bg-muted flex h-24 w-16 items-center justify-center rounded">
								<BookOpen class="text-muted-foreground h-8 w-8" />
							</div>
						{/if}

						<div class="min-w-0 flex-1">
							<div class="mb-2 flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1">
									<h3 class="truncate text-lg font-semibold">{request.book.title}</h3>
									<p class="text-muted-foreground truncate text-sm">
										{request.book.author || 'Unknown Author'}
									</p>
								</div>
								<div class="flex flex-col items-end gap-2">
									<Badge variant={getStatusVariant(request.status)}>
										{request.status}
									</Badge>
									{#if request.download && data.annasArchiveEnabled}
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
									{/if}
								</div>
							</div>

							<div class="text-muted-foreground mb-3 flex flex-wrap gap-4 text-sm">
								<div class="flex items-center gap-1">
									<User class="h-4 w-4" />
									<span>{request.user.displayName}</span>
								</div>

								<div class="flex items-center gap-1">
									<Calendar class="h-4 w-4" />
									<span>
										{formatDistance(new Date(request.createdAt), new Date(), {
											addSuffix: true
										})}
									</span>
								</div>

								{#if request.language}
									<div class="flex items-center gap-1">
										<span>Language: {request.language}</span>
									</div>
								{/if}

								{#if request.specialNotes}
									<div class="flex items-center gap-1">
										<MessageSquare class="h-4 w-4" />
										<span class="truncate">{request.specialNotes}</span>
									</div>
								{/if}
							</div>

							<!-- Action buttons -->
							<div class="flex flex-wrap gap-2">
								{#if request.status === 'pending'}
									<form method="POST" action="?/updateStatus" use:enhance>
										<input type="hidden" name="requestId" value={request.id} />
										<input type="hidden" name="status" value="approved" />
										<Button type="submit" size="sm" variant="default">Approve</Button>
									</form>

									<form method="POST" action="?/updateStatus" use:enhance>
										<input type="hidden" name="requestId" value={request.id} />
										<input type="hidden" name="status" value="rejected" />
										<Button type="submit" size="sm" variant="destructive">Reject</Button>
									</form>
								{:else if request.status === 'approved'}
									{#if data.annasArchiveEnabled && !request.download}
										<Button
											size="sm"
											variant="default"
											onclick={() => initiateDownload(request.id)}
											disabled={downloadingRequests.has(request.id)}
										>
											<Download class="mr-2 h-4 w-4" />
											{downloadingRequests.has(request.id) ? 'Downloading...' : 'Download'}
										</Button>
									{/if}

									<form method="POST" action="?/updateStatus" use:enhance>
										<input type="hidden" name="requestId" value={request.id} />
										<input type="hidden" name="status" value="completed" />
										<Button type="submit" size="sm">Mark as Completed</Button>
									</form>
								{:else if request.status === 'download_problem'}
									{#if data.annasArchiveEnabled && request.download}
										<Button
											size="sm"
											variant="default"
											onclick={() => retryDownload(request.download.id, request.id)}
											disabled={downloadingRequests.has(request.id)}
										>
											<RefreshCw class="mr-2 h-4 w-4" />
											{downloadingRequests.has(request.id) ? 'Retrying...' : 'Retry Download'}
										</Button>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<FileSelectionModal
	bind:isOpen={showFileSelection}
	results={availableFiles}
	onSelect={handleFileSelection}
/>
