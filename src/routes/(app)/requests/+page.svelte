<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { BookOpen, Calendar, MessageSquare, Book, Headphones } from 'lucide-svelte';
	import { formatDistance } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state<string>('all');

	const filteredRequests = $derived(
		statusFilter === 'all' ? data.requests : data.requests.filter((r) => r.status === statusFilter)
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
			default:
				return 'secondary';
		}
	}
</script>

<svelte:head>
	<title>My Requests - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-3xl font-bold">My Requests</h1>
		<p class="text-muted-foreground">Track the status of your book requests</p>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-2">
		<Button
			variant={statusFilter === 'all' ? 'default' : 'outline'}
			size="sm"
			onclick={() => {
				statusFilter = 'all';
			}}
		>
			All ({data.requests.length})
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
	</div>

	<!-- Requests list -->
	{#if filteredRequests.length === 0}
		<Card class="p-12 text-center">
			<BookOpen class="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-50" />
			<p class="text-muted-foreground mb-4">
				{statusFilter === 'all' ? 'No requests yet' : `No ${statusFilter} requests`}
			</p>
			<Button>
				<a href="/search">Search Books</a>
			</Button>
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
								<div class="flex items-center gap-2">
									<Badge variant="outline" class="flex items-center gap-1">
										{#if request.formatType === 'audiobook'}
											<Headphones class="h-3 w-3" />
											<span>Audiobook</span>
										{:else}
											<Book class="h-3 w-3" />
											<span>Ebook</span>
										{/if}
									</Badge>
									<Badge variant={getStatusVariant(request.status)}>
										{request.status}
									</Badge>
								</div>
							</div>

							<div class="text-muted-foreground flex flex-wrap gap-4 text-sm">
								<div class="flex items-center gap-1">
									<Calendar class="h-4 w-4" />
									<span>
										Requested {formatDistance(new Date(request.createdAt), new Date(), {
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
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
