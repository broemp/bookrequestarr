<script lang="ts">
	import type { PageData } from './$types';
	import RequestCard from '$lib/components/RequestCard.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import FileSelectionModal from '$lib/components/FileSelectionModal.svelte';
	import { BookOpen } from 'lucide-svelte';
	import type { AnnasArchiveSearchResult } from '$lib/types/download';

	let { data }: { data: PageData } = $props();

	// State for filtering and sorting
	let activeFilter = $state('active');
	let searchValue = $state('');
	let sortBy = $state('newest');

	// File selection modal state
	let showFileSelection = $state(false);
	let selectedRequestId = $state<string | null>(null);
	let availableFiles = $state<AnnasArchiveSearchResult[]>([]);

	// Processing state
	let processingRequests = $state<Set<string>>(new Set());

	// Transform data for RequestCard component
	const transformedRequests = $derived(
		data.requests.map((req) => ({
			id: req.id,
			bookTitle: req.book.title,
			bookAuthor: req.book.author || undefined,
			bookCoverUrl: req.book.coverImage || undefined,
			language: req.language || 'Unknown',
			formatType: req.formatType,
			status: req.status,
			specialNotes: req.specialNotes || undefined,
			userName: req.user.displayName,
			createdAt: req.createdAt.toString(),
			download:
				req.download && req.download.id
					? {
							id: req.download.id,
							status: req.download.downloadStatus,
							errorMessage: req.download.errorMessage || undefined,
							source: req.download.downloadSource || undefined,
							fileName: req.download.fileType || undefined,
							fileFormat: req.download.fileType || undefined,
							fileSize: req.download.fileSize || undefined,
							progress: undefined
						}
					: undefined
		}))
	);

	// Filter configuration
	const filters = $derived([
		{
			id: 'all',
			label: 'All',
			count: transformedRequests.length
		},
		{
			id: 'active',
			label: 'Active',
			count: transformedRequests.filter((r) => r.status === 'pending' || r.status === 'approved')
				.length
		},
		{
			id: 'pending',
			label: 'Pending',
			count: transformedRequests.filter((r) => r.status === 'pending').length
		},
		{
			id: 'approved',
			label: 'Approved',
			count: transformedRequests.filter((r) => r.status === 'approved').length
		},
		{
			id: 'completed',
			label: 'Completed',
			count: transformedRequests.filter((r) => r.status === 'completed').length
		},
		{
			id: 'download_problem',
			label: 'Failed',
			count: transformedRequests.filter((r) => r.status === 'download_problem').length
		},
		{
			id: 'rejected',
			label: 'Rejected',
			count: transformedRequests.filter((r) => r.status === 'rejected').length
		}
	]);

	// Apply filters and search
	const filteredRequests = $derived(() => {
		let result = transformedRequests;

		// Apply status filter
		if (activeFilter === 'active') {
			result = result.filter((r) => r.status === 'pending' || r.status === 'approved');
		} else if (activeFilter !== 'all') {
			result = result.filter((r) => r.status === activeFilter);
		}

		// Apply search filter
		if (searchValue.trim()) {
			const search = searchValue.toLowerCase();
			result = result.filter(
				(r) =>
					r.bookTitle.toLowerCase().includes(search) ||
					r.bookAuthor?.toLowerCase().includes(search) ||
					r.userName?.toLowerCase().includes(search)
			);
		}

		// Apply sorting
		if (sortBy === 'newest') {
			result = [...result].sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		} else if (sortBy === 'oldest') {
			result = [...result].sort(
				(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
		} else if (sortBy === 'title') {
			result = [...result].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
		}

		return result;
	});

	// Action handlers
	async function handleApprove(request: { id: string }) {
		processingRequests.add(request.id);
		processingRequests = processingRequests;

		try {
			const response = await fetch('?/updateStatus', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					requestId: request.id,
					status: 'approved'
				})
			});

			if (response.ok) {
				window.location.reload();
			} else {
				alert('Failed to approve request');
			}
		} catch (error) {
			console.error('Error approving request:', error);
			alert('Failed to approve request');
		} finally {
			processingRequests.delete(request.id);
			processingRequests = processingRequests;
		}
	}

	async function handleReject(request: { id: string; bookTitle: string }) {
		if (!confirm(`Reject request for "${request.bookTitle}"?`)) {
			return;
		}

		processingRequests.add(request.id);
		processingRequests = processingRequests;

		try {
			const response = await fetch('?/updateStatus', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					requestId: request.id,
					status: 'rejected'
				})
			});

			if (response.ok) {
				window.location.reload();
			} else {
				alert('Failed to reject request');
			}
		} catch (error) {
			console.error('Error rejecting request:', error);
			alert('Failed to reject request');
		} finally {
			processingRequests.delete(request.id);
			processingRequests = processingRequests;
		}
	}

	async function handleDownload(request: { id: string }) {
		processingRequests.add(request.id);
		processingRequests = processingRequests;

		try {
			const response = await fetch('/api/downloads/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestId: request.id })
			});

			const result = await response.json();

			if (result.requiresSelection) {
				// Show file selection modal
				selectedRequestId = request.id;
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
			processingRequests.delete(request.id);
			processingRequests = processingRequests;
		}
	}

	async function handleRetry(request: { id: string; download?: { id: string } }) {
		if (!request.download?.id) return;

		processingRequests.add(request.id);
		processingRequests = processingRequests;

		try {
			const response = await fetch(`/api/downloads/retry/${request.download.id}`, {
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
			processingRequests.delete(request.id);
			processingRequests = processingRequests;
		}
	}

	async function handleFileSelection(file: AnnasArchiveSearchResult) {
		if (!selectedRequestId) return;

		processingRequests.add(selectedRequestId);
		processingRequests = processingRequests;

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
			processingRequests.delete(selectedRequestId);
			processingRequests = processingRequests;
			selectedRequestId = null;
		}
	}
</script>

<svelte:head>
	<title>Admin: Requests - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">Manage Requests</h1>
		<p class="text-muted-foreground">Review and manage book requests from all users</p>
	</div>

	<!-- Filter Bar -->
	<FilterBar
		{filters}
		bind:activeFilter
		bind:searchValue
		bind:sortBy
		sortOptions={[
			{ value: 'newest', label: 'Newest First' },
			{ value: 'oldest', label: 'Oldest First' },
			{ value: 'title', label: 'Title A-Z' }
		]}
	/>

	<!-- Requests list -->
	{#if filteredRequests().length === 0}
		<Card class="p-12 text-center">
			<BookOpen class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
			<p class="text-muted-foreground">
				{#if searchValue.trim()}
					No requests found matching "{searchValue}"
				{:else if activeFilter === 'all'}
					No requests yet
				{:else if activeFilter === 'active'}
					No active requests
				{:else}
					No {activeFilter.replace('_', ' ')} requests
				{/if}
			</p>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredRequests() as request (request.id)}
				<RequestCard
					{request}
					showActions={true}
					showUserInfo={true}
					onApprove={request.status === 'pending' ? handleApprove : undefined}
					onReject={request.status === 'pending' ? handleReject : undefined}
					onDownload={request.status === 'approved' && data.annasArchiveEnabled && !request.download
						? handleDownload
						: undefined}
					onRetry={request.status === 'download_problem' && request.download
						? handleRetry
						: undefined}
				/>
			{/each}
		</div>
	{/if}
</div>

<FileSelectionModal
	bind:isOpen={showFileSelection}
	results={availableFiles}
	onSelect={handleFileSelection}
/>
