<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import {
		Download,
		CheckCircle,
		XCircle,
		Clock,
		HardDrive,
		FileText,
		Users,
		TrendingUp,
		Calendar,
		Search,
		File
	} from 'lucide-svelte';
	import { formatDistance } from 'date-fns';

	let { data }: { data: PageData } = $props();

	// Format file size
	function formatFileSize(bytes: number | null): string {
		if (!bytes) return 'N/A';
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		if (bytes === 0) return '0 B';
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
	}

	// Get status badge variant
	function getStatusVariant(status: string) {
		switch (status) {
			case 'completed':
				return 'default';
			case 'failed':
				return 'destructive';
			case 'downloading':
				return 'default';
			case 'pending':
				return 'secondary';
			default:
				return 'secondary';
		}
	}

	// Get search method label
	function getSearchMethodLabel(method: string): string {
		switch (method) {
			case 'isbn':
				return 'ISBN';
			case 'title_author':
				return 'Title/Author';
			case 'manual':
				return 'Manual';
			default:
				return method;
		}
	}

	// Calculate success rate
	const successRate = $derived(
		data.stats.total > 0 ? Math.round((data.stats.completed / data.stats.total) * 100) : 0
	);

	// Filter state
	let statusFilter = $state<string>('all');

	const filteredDownloads = $derived(
		statusFilter === 'all'
			? data.recentDownloads
			: data.recentDownloads.filter((d) => d.downloadStatus === statusFilter)
	);
</script>

<svelte:head>
	<title>Admin: Downloads - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">Downloads Overview</h1>
		<p class="text-muted-foreground">Monitor and analyze book downloads</p>
	</div>

	<!-- Statistics Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Downloads -->
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Downloads</p>
					<p class="text-2xl font-bold">{data.stats.total}</p>
				</div>
				<div class="bg-primary/10 text-primary rounded-full p-3">
					<Download class="h-5 w-5" />
				</div>
			</div>
		</Card>

		<!-- Completed Downloads -->
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Completed</p>
					<p class="text-2xl font-bold">{data.stats.completed}</p>
					<p class="text-muted-foreground text-xs">{successRate}% success rate</p>
				</div>
				<div class="rounded-full bg-green-500/10 p-3 text-green-500">
					<CheckCircle class="h-5 w-5" />
				</div>
			</div>
		</Card>

		<!-- Failed Downloads -->
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Failed</p>
					<p class="text-2xl font-bold">{data.stats.failed}</p>
				</div>
				<div class="rounded-full bg-red-500/10 p-3 text-red-500">
					<XCircle class="h-5 w-5" />
				</div>
			</div>
		</Card>

		<!-- Total Storage -->
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Storage</p>
					<p class="text-2xl font-bold">{formatFileSize(data.stats.totalSize)}</p>
				</div>
				<div class="bg-primary/10 text-primary rounded-full p-3">
					<HardDrive class="h-5 w-5" />
				</div>
			</div>
		</Card>
	</div>

	<!-- Active Downloads -->
	{#if data.stats.downloading > 0 || data.stats.pending > 0}
		<Card class="p-6">
			<h2 class="mb-4 text-lg font-semibold">Active Downloads</h2>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex items-center justify-between rounded-lg bg-blue-500/10 p-4">
					<div class="flex items-center gap-3">
						<Download class="h-5 w-5 text-blue-500" />
						<div>
							<p class="font-medium">Downloading</p>
							<p class="text-muted-foreground text-sm">In progress</p>
						</div>
					</div>
					<p class="text-2xl font-bold">{data.stats.downloading}</p>
				</div>
				<div class="flex items-center justify-between rounded-lg bg-yellow-500/10 p-4">
					<div class="flex items-center gap-3">
						<Clock class="h-5 w-5 text-yellow-500" />
						<div>
							<p class="font-medium">Pending</p>
							<p class="text-muted-foreground text-sm">Waiting to start</p>
						</div>
					</div>
					<p class="text-2xl font-bold">{data.stats.pending}</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Analytics Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		<!-- Downloads by File Type -->
		<Card class="p-6">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
				<FileText class="h-5 w-5" />
				By File Type
			</h2>
			<div class="space-y-3">
				{#each data.downloadsByFileType as { fileType, count } (fileType)}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<File class="text-muted-foreground h-4 w-4" />
							<span class="font-medium uppercase">{fileType}</span>
						</div>
						<Badge variant="secondary">{count}</Badge>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No completed downloads yet</p>
				{/each}
			</div>
		</Card>

		<!-- Downloads by Search Method -->
		<Card class="p-6">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
				<Search class="h-5 w-5" />
				By Search Method
			</h2>
			<div class="space-y-3">
				{#each data.downloadsBySearchMethod as { searchMethod, count } (searchMethod)}
					<div class="flex items-center justify-between">
						<span class="font-medium">{getSearchMethodLabel(searchMethod)}</span>
						<Badge variant="secondary">{count}</Badge>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No completed downloads yet</p>
				{/each}
			</div>
		</Card>

		<!-- Top Users -->
		<Card class="p-6">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
				<Users class="h-5 w-5" />
				Top Users
			</h2>
			<div class="space-y-3">
				{#each data.topUsers as user (user.userId)}
					<div class="flex items-center justify-between">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{user.userDisplayName}</p>
							<p class="text-muted-foreground truncate text-xs">{user.userEmail}</p>
						</div>
						<Badge variant="secondary">{user.downloadCount}</Badge>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No downloads yet</p>
				{/each}
			</div>
		</Card>
	</div>

	<!-- Daily Stats Chart (Last 30 Days) -->
	{#if data.dailyStats.length > 0}
		<Card class="p-6">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
				<TrendingUp class="h-5 w-5" />
				Daily Downloads (Last 30 Days)
			</h2>
			<div class="space-y-2">
				{#each data.dailyStats.slice(0, 10) as stat (stat.date)}
					<div class="flex items-center gap-4">
						<div class="text-muted-foreground w-24 text-sm">{stat.date}</div>
						<div class="flex-1">
							<div class="bg-primary/20 h-6 rounded-full">
								<div
									class="bg-primary h-full rounded-full transition-all"
									style="width: {Math.min(
										(stat.downloadCount /
											Math.max(...data.dailyStats.map((s) => s.downloadCount))) *
											100,
										100
									)}%"
								></div>
							</div>
						</div>
						<div class="w-12 text-right text-sm font-medium">{stat.downloadCount}</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Recent Downloads -->
	<Card class="p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Recent Downloads</h2>
			<div class="flex gap-2">
				<Button
					variant={statusFilter === 'all' ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						statusFilter = 'all';
					}}
				>
					All
				</Button>
				<Button
					variant={statusFilter === 'completed' ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						statusFilter = 'completed';
					}}
				>
					Completed
				</Button>
				<Button
					variant={statusFilter === 'failed' ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						statusFilter = 'failed';
					}}
				>
					Failed
				</Button>
				<Button
					variant={statusFilter === 'downloading' ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						statusFilter = 'downloading';
					}}
				>
					Downloading
				</Button>
			</div>
		</div>

		<div class="space-y-4">
			{#each filteredDownloads as download (download.id)}
				<div class="border-border flex items-start gap-4 rounded-lg border p-4">
					<!-- Book Cover -->
					{#if download.bookCoverImage}
						<img
							src={download.bookCoverImage}
							alt={download.bookTitle}
							class="h-24 w-16 rounded object-cover"
						/>
					{:else}
						<div class="bg-muted flex h-24 w-16 items-center justify-center rounded">
							<FileText class="text-muted-foreground h-8 w-8" />
						</div>
					{/if}

					<!-- Download Info -->
					<div class="min-w-0 flex-1">
						<div class="mb-2 flex items-start justify-between gap-4">
							<div class="min-w-0 flex-1">
								<h3 class="mb-1 font-semibold">{download.bookTitle}</h3>
								<p class="text-muted-foreground mb-2 text-sm">
									{download.bookAuthors.join(', ') || 'Unknown Author'}
								</p>
								<div class="flex flex-wrap gap-2">
									<Badge variant={getStatusVariant(download.downloadStatus)}>
										{#if download.downloadStatus === 'completed'}
											<CheckCircle class="mr-1 h-3 w-3" />
										{:else if download.downloadStatus === 'failed'}
											<XCircle class="mr-1 h-3 w-3" />
										{:else if download.downloadStatus === 'downloading'}
											<Download class="mr-1 h-3 w-3" />
										{:else}
											<Clock class="mr-1 h-3 w-3" />
										{/if}
										{download.downloadStatus}
									</Badge>
									<Badge variant="outline">{download.fileType.toUpperCase()}</Badge>
									<Badge variant="outline">{getSearchMethodLabel(download.searchMethod)}</Badge>
									{#if download.fileSize}
										<Badge variant="outline">{formatFileSize(download.fileSize)}</Badge>
									{/if}
								</div>
							</div>
						</div>

						<!-- User and Date Info -->
						<div class="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
							<div class="flex items-center gap-1">
								<Users class="h-4 w-4" />
								<span>{download.userDisplayName}</span>
							</div>
							<div class="flex items-center gap-1">
								<Calendar class="h-4 w-4" />
								<span>
									{formatDistance(new Date(download.createdAt), new Date(), { addSuffix: true })}
								</span>
							</div>
							{#if download.requestLanguage}
								<Badge variant="secondary">{download.requestLanguage}</Badge>
							{/if}
						</div>

						<!-- Error Message -->
						{#if download.downloadStatus === 'failed' && download.errorMessage}
							<div class="mt-2 rounded-md bg-red-500/10 p-2 text-sm text-red-500">
								<strong>Error:</strong>
								{download.errorMessage}
							</div>
						{/if}

						<!-- File Path / Calibre Link -->
						{#if download.downloadStatus === 'completed'}
							{#if data.calibreEnabled}
								<div class="mt-2 flex items-center gap-2">
									<Badge variant="outline" class="text-green-600">
										<CheckCircle class="mr-1 h-3 w-3" />
										Delivered to Calibre-Web
									</Badge>
									<!-- eslint-disable svelte/no-navigation-without-resolve -->
									{#if data.calibreBaseUrl}
										<a
											href={`${data.calibreBaseUrl}/search?query=${encodeURIComponent(`${download.bookTitle} ${download.bookAuthors.join(' ')}`)}`}
											target="_blank"
											rel="external noopener noreferrer"
											class="text-xs text-blue-500 hover:underline"
										>
											Search in Calibre-Web →
										</a>
									{/if}
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								</div>
								{#if download.filePath}
									<div class="text-muted-foreground mt-1 text-xs">
										<strong>Original path:</strong>
										{download.filePath}
									</div>
								{:else}
									<div class="text-muted-foreground mt-1 text-xs">
										(File cleaned up after ingestion)
									</div>
								{/if}
							{:else if download.filePath}
								<div class="text-muted-foreground mt-2 text-xs">
									<strong>Path:</strong>
									{download.filePath}
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{:else}
				<p class="text-muted-foreground text-center py-8">No downloads found</p>
			{/each}
		</div>
	</Card>
</div>
