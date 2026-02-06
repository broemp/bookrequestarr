<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { Settings } from 'lucide-svelte';

	interface Props {
		stats: {
			totalUsers: number;
			totalRequests: number;
		};
	}

	let { stats }: Props = $props();
</script>

<Card class="p-6">
	<div class="mb-4 flex items-center gap-3">
		<Settings class="h-6 w-6" />
		<h2 class="text-xl font-semibold">System Information</h2>
	</div>

	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium">Application Version</p>
				<p class="text-muted-foreground text-sm">Current version of Bookrequestarr</p>
			</div>
			<Badge>v0.0.1</Badge>
		</div>

		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium">Database</p>
				<p class="text-muted-foreground text-sm">SQLite with Drizzle ORM</p>
			</div>
			<Badge variant="secondary">Active</Badge>
		</div>

		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium">Total Users</p>
				<p class="text-muted-foreground text-sm">Registered user accounts</p>
			</div>
			<Badge variant="secondary">{stats.totalUsers}</Badge>
		</div>

		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium">Total Requests</p>
				<p class="text-muted-foreground text-sm">All book requests</p>
			</div>
			<Badge variant="secondary">{stats.totalRequests}</Badge>
		</div>
	</div>
</Card>
