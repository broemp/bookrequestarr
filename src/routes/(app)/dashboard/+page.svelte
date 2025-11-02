<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { BookOpen, Clock, CheckCircle, XCircle } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<!-- Welcome section -->
	<div>
		<h1 class="mb-2 text-3xl font-bold">Welcome back, {data.user.displayName}! 👋</h1>
		<p class="text-muted-foreground">Here's what's happening with your book requests.</p>
	</div>

	<!-- Trending Books -->
	{#if data.trendingBooks.length > 0}
		<div>
			<h2 class="mb-4 text-2xl font-bold">Trending Books</h2>

			<div class="relative -mx-6 px-6">
				<div class="flex gap-3 overflow-x-auto pb-4">
					{#each data.trendingBooks as book}
						<a href="/search?book={book.hardcoverId}" class="group flex-shrink-0 w-32">
							<div class="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md transition-all group-hover:shadow-xl group-hover:scale-105">
								{#if book.coverImage}
									<img src={book.coverImage} alt={book.title} class="h-full w-full object-cover" />
								{:else}
									<div class="bg-muted flex h-full w-full items-center justify-center">
										<BookOpen class="text-muted-foreground h-8 w-8" />
									</div>
								{/if}
							</div>

							<div class="mt-2">
								<h3 class="line-clamp-2 text-xs font-medium leading-tight">{book.title}</h3>
								<p class="text-muted-foreground truncate text-xs mt-0.5">
									{book.author || 'Unknown Author'}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Stats -->
	<div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Total Requests</p>
					<p class="text-2xl font-bold">{data.stats.total}</p>
				</div>
				<BookOpen class="text-muted-foreground h-8 w-8" />
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Pending</p>
					<p class="text-2xl font-bold">{data.stats.pending}</p>
				</div>
				<Clock class="h-8 w-8 text-yellow-500" />
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Approved</p>
					<p class="text-2xl font-bold">{data.stats.approved}</p>
				</div>
				<CheckCircle class="h-8 w-8 text-green-500" />
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-muted-foreground text-sm font-medium">Completed</p>
					<p class="text-2xl font-bold">{data.stats.completed}</p>
				</div>
				<CheckCircle class="h-8 w-8 text-blue-500" />
			</div>
		</Card>
	</div>

	<!-- Recent Requests -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-2xl font-bold">Recent Requests</h2>
			<Button variant="outline" size="sm">
				<a href="/requests">View All</a>
			</Button>
		</div>

		{#if data.recentRequests.length === 0}
			<Card class="p-8 text-center">
				<div class="text-muted-foreground">
					<BookOpen class="mx-auto mb-3 h-12 w-12 opacity-50" />
					<p>No requests yet. Start by searching for books!</p>
					<Button class="mt-4">
						<a href="/search">Search Books</a>
					</Button>
				</div>
			</Card>
		{:else}
			<div class="relative -mx-6 px-6">
				<div class="flex gap-3 overflow-x-auto pb-4">
					{#each data.recentRequests as request}
						<a href="/requests" class="group flex-shrink-0 w-32 relative">
							<div class="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md transition-all group-hover:shadow-xl group-hover:scale-105">
								{#if request.book.coverImage}
									<img
										src={request.book.coverImage}
										alt={request.book.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="bg-muted flex h-full w-full items-center justify-center">
										<BookOpen class="text-muted-foreground h-8 w-8" />
									</div>
								{/if}
								
								<!-- Status badge overlay -->
								<div class="absolute top-2 right-2">
									<Badge
										variant={request.status === 'pending'
											? 'secondary'
											: request.status === 'approved'
												? 'default'
												: request.status === 'completed'
													? 'default'
													: 'destructive'}
										class="text-xs shadow-lg"
									>
										{request.status}
									</Badge>
								</div>
							</div>

							<div class="mt-2">
								<h3 class="line-clamp-2 text-xs font-medium leading-tight">{request.book.title}</h3>
								<p class="text-muted-foreground truncate text-xs mt-0.5">
									{request.book.author || 'Unknown Author'}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
