<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { User, Mail, Calendar, Shield, UserPlus, Download } from 'lucide-svelte';
	import { formatDistance } from 'date-fns';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let showCreateModal = $state(false);

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			showCreateModal = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showCreateModal = false;
		}
	}
</script>

<svelte:window onkeydown={showCreateModal ? handleKeydown : undefined} />

<svelte:head>
	<title>Admin: Users - Bookrequestarr</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">Manage Users</h1>
			<p class="text-muted-foreground">View and manage user accounts</p>
		</div>
		<Button
			onclick={() => {
				showCreateModal = true;
			}}
		>
			<UserPlus class="mr-2 h-4 w-4" />
			Create User
		</Button>
	</div>

	<!-- Users list -->
	<div class="space-y-4">
		{#each data.users as user (user.id)}
			<Card class="p-4">
				<div class="flex items-start justify-between gap-4">
					<div class="flex min-w-0 flex-1 items-start gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
						>
							{user.displayName.charAt(0).toUpperCase()}
						</div>

						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center gap-2">
								<h3 class="truncate text-lg font-semibold">{user.displayName}</h3>
								<Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
									{user.role}
								</Badge>
							</div>

							<div class="space-y-1 text-sm text-muted-foreground">
								<div class="flex items-center gap-2">
									<Mail class="h-4 w-4" />
									<span class="truncate">{user.email}</span>
								</div>
								<div class="flex items-center gap-2">
									<User class="h-4 w-4" />
									<span>@{user.username}</span>
								</div>
								<div class="flex items-center gap-2">
									<Calendar class="h-4 w-4" />
									<span>
										Joined {formatDistance(new Date(user.createdAt), new Date(), {
											addSuffix: true
										})}
									</span>
								</div>
								{#if data.downloadAutoMode === 'selected_users'}
									<div class="flex items-center gap-2">
										<Download class="h-4 w-4" />
										<span>
											Auto-Download: {user.autoDownloadEnabled ? 'Enabled' : 'Disabled'}
										</span>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-2">
						{#if user.role === 'user'}
							<form method="POST" action="?/promoteUser" use:enhance>
								<input type="hidden" name="userId" value={user.id} />
								<Button type="submit" size="sm" variant="outline">
									<Shield class="mr-2 h-4 w-4" />
									Promote to Admin
								</Button>
							</form>
						{/if}

						{#if data.downloadAutoMode === 'selected_users'}
							<form method="POST" action="?/toggleAutoDownload" use:enhance>
								<input type="hidden" name="userId" value={user.id} />
								<input
									type="hidden"
									name="enabled"
									value={user.autoDownloadEnabled ? 'false' : 'true'}
								/>
								<Button type="submit" size="sm" variant="outline">
									<Download class="mr-2 h-4 w-4" />
									{user.autoDownloadEnabled ? 'Disable' : 'Enable'} Auto-Download
								</Button>
							</form>
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>
</div>

<!-- Create user modal -->
{#if showCreateModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-md"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-user-title"
			tabindex="-1"
		>
			<Card class="p-6">
				<h2 id="create-user-title" class="mb-4 text-2xl font-bold">Create New User</h2>

				<form method="POST" action="?/createUser" use:enhance class="space-y-4">
					<div>
						<label for="email" class="mb-2 block text-sm font-medium">Email</label>
						<Input id="email" name="email" type="email" required placeholder="user@example.com" />
					</div>

					<div>
						<label for="username" class="mb-2 block text-sm font-medium">Username</label>
						<Input id="username" name="username" required placeholder="username" />
					</div>

					<div>
						<label for="displayName" class="mb-2 block text-sm font-medium">Display Name</label>
						<Input id="displayName" name="displayName" required placeholder="John Doe" />
					</div>

					<div>
						<label for="role" class="mb-2 block text-sm font-medium">Role</label>
						<select
							id="role"
							name="role"
							class="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							style="background-color: hsl(var(--input));"
						>
							<option value="user">User</option>
							<option value="admin">Admin</option>
						</select>
					</div>

					<div class="flex gap-3">
						<Button type="submit" class="flex-1">Create User</Button>
						<Button
							type="button"
							variant="outline"
							onclick={() => {
								showCreateModal = false;
							}}
						>
							Cancel
						</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
{/if}
