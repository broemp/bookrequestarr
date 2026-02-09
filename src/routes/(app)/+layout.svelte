<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Button from '$lib/components/ui/button.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import {
		Home,
		Search,
		FileText,
		Settings,
		Users,
		LogOut,
		Bell,
		Menu,
		X,
		Download
	} from 'lucide-svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let sidebarOpen = $state(true);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform duration-300 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
		style="background-color: hsl(var(--card));"
	>
		<div class="flex h-full flex-col">
			<!-- Logo -->
			<div class="flex items-center justify-between border-b border-border px-6 py-4">
				<h1 class="text-xl font-bold">Bookrequestarr</h1>
				<button
					class="lg:hidden"
					onclick={() => {
						sidebarOpen = false;
					}}
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto p-4">
				<!-- User Section -->
				<div class="mb-6">
					<div class="mb-2 px-3">
						<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							Discover
						</p>
					</div>
					<div class="space-y-1">
						<a
							href={resolve('/dashboard')}
							class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
								.url.pathname === '/dashboard'
								? 'border-l-2 border-primary bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<Home class="h-5 w-5" />
							Dashboard
						</a>
						<a
							href={resolve('/browse')}
							class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
								.url.pathname === '/browse'
								? 'border-l-2 border-primary bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<Search class="h-5 w-5" />
							Browse Books
						</a>
						<a
							href={resolve('/requests')}
							class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
								.url.pathname === '/requests'
								? 'border-l-2 border-primary bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<FileText class="h-5 w-5" />
							My Requests
						</a>
					</div>
				</div>

				<div class="mb-6">
					<div class="mb-2 px-3">
						<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							Settings
						</p>
					</div>
					<div class="space-y-1">
						<a
							href={resolve('/settings')}
							class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
								.url.pathname === '/settings'
								? 'border-l-2 border-primary bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<Settings class="h-5 w-5" />
							User Settings
						</a>
					</div>
				</div>

				<!-- Admin Section -->
				{#if data.user?.role === 'admin'}
					<div class="mb-4 border-t border-border pt-4"></div>
					<div>
						<div class="mb-2 px-3">
							<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
								Administration
							</p>
						</div>
						<div class="space-y-1">
							<a
								href={resolve('/admin/requests')}
								class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
									.url.pathname === '/admin/requests'
									? 'border-l-2 border-primary bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<FileText class="h-5 w-5" />
								Requests
							</a>
							<a
								href={resolve('/admin/downloads')}
								class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
									.url.pathname === '/admin/downloads'
									? 'border-l-2 border-primary bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<Download class="h-5 w-5" />
								Downloads
							</a>
							<a
								href={resolve('/admin/users')}
								class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
									.url.pathname === '/admin/users'
									? 'border-l-2 border-primary bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<Users class="h-5 w-5" />
								Users
							</a>
							<a
								href={resolve('/admin/config')}
								class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {$page
									.url.pathname === '/admin/config'
									? 'border-l-2 border-primary bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<Settings class="h-5 w-5" />
								Configuration
							</a>
						</div>
					</div>
				{/if}
			</nav>

			<!-- User section -->
			<div class="border-t border-border p-4">
				<div class="mb-3 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
					>
						{data.user?.displayName?.charAt(0).toUpperCase() || 'U'}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{data.user?.displayName}</p>
						<p class="truncate text-xs text-muted-foreground">{data.user?.email}</p>
					</div>
				</div>
				<Button variant="outline" size="sm" class="w-full" onclick={handleLogout}>
					<LogOut class="mr-2 h-4 w-4" />
					Logout
				</Button>
			</div>
		</div>
	</aside>

	<!-- Main content -->
	<div class="lg:pl-64">
		<!-- Mobile menu button (only visible on mobile when sidebar is closed) -->
		{#if !sidebarOpen}
			<button
				class="fixed top-6 left-6 z-50 rounded-md p-2 hover:bg-accent lg:hidden"
				onclick={() => {
					sidebarOpen = true;
				}}
				aria-label="Open menu"
			>
				<Menu class="h-6 w-6" />
			</button>
		{/if}

		<!-- Notifications button (top right) -->
		<button class="fixed top-6 right-6 z-50 rounded-md p-2 hover:bg-accent">
			<Bell class="h-5 w-5" />
			<span
				class="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"
				aria-label="Notifications"
			></span>
		</button>

		<!-- Page content -->
		<main class="p-6 pt-20 lg:pt-6">
			{@render children()}
		</main>
	</div>
</div>

<!-- Overlay for mobile -->
{#if sidebarOpen}
	<button
		class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
		onclick={() => {
			sidebarOpen = false;
		}}
		aria-label="Close sidebar"
	></button>
{/if}

<!-- Toast notifications -->
<Toast />
