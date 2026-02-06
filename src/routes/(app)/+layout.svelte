<script lang="ts">
	import { page } from '$app/stores';
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

	let { data, children }: { data: LayoutData; children: any } = $props();

	let sidebarOpen = $state(true);

	const navigation = $derived([
		{ name: 'Dashboard', href: '/dashboard', icon: Home },
		{ name: 'Search Books', href: '/search', icon: Search },
		{ name: 'My Requests', href: '/requests', icon: FileText },
		{ name: 'Settings', href: '/settings', icon: Settings },
		...(data.user?.role === 'admin'
			? [
					{ name: 'Admin: Requests', href: '/admin/requests', icon: FileText },
					{ name: 'Admin: Downloads', href: '/admin/downloads', icon: Download },
					{ name: 'Admin: Users', href: '/admin/users', icon: Users },
					{ name: 'Admin: Settings', href: '/admin/settings', icon: Settings }
				]
			: [])
	]);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<div class="bg-background min-h-screen">
	<!-- Sidebar -->
	<aside
		class="bg-card border-border fixed inset-y-0 left-0 z-50 w-64 border-r transition-transform duration-300 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
		style="background-color: hsl(var(--card));"
	>
		<div class="flex h-full flex-col">
			<!-- Logo -->
			<div class="border-border flex items-center justify-between border-b px-6 py-4">
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
					<div class="px-3 mb-2">
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Discover
						</p>
					</div>
					<div class="space-y-1">
						<a
							href="/dashboard"
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
								.url.pathname === '/dashboard'
								? 'bg-accent text-accent-foreground border-l-2 border-primary'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<Home class="h-5 w-5" />
							Dashboard
						</a>
						<a
							href="/browse"
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
								.url.pathname === '/browse'
								? 'bg-accent text-accent-foreground border-l-2 border-primary'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<Search class="h-5 w-5" />
							Browse Books
						</a>
						<a
							href="/requests"
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
								.url.pathname === '/requests'
								? 'bg-accent text-accent-foreground border-l-2 border-primary'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<FileText class="h-5 w-5" />
							My Requests
						</a>
					</div>
				</div>

				<div class="mb-6">
					<div class="px-3 mb-2">
						<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Settings
						</p>
					</div>
					<div class="space-y-1">
						<a
							href="/settings"
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
								.url.pathname === '/settings'
								? 'bg-accent text-accent-foreground border-l-2 border-primary'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
						>
							<Settings class="h-5 w-5" />
							User Settings
						</a>
					</div>
				</div>

				<!-- Admin Section -->
				{#if data.user?.role === 'admin'}
					<div class="border-t border-border pt-4 mb-4"></div>
					<div>
						<div class="px-3 mb-2">
							<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Administration
							</p>
						</div>
						<div class="space-y-1">
							<a
								href="/admin/requests"
								class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
									.url.pathname === '/admin/requests'
									? 'bg-accent text-accent-foreground border-l-2 border-primary'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<FileText class="h-5 w-5" />
								Requests
							</a>
							<a
								href="/admin/downloads"
								class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
									.url.pathname === '/admin/downloads'
									? 'bg-accent text-accent-foreground border-l-2 border-primary'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<Download class="h-5 w-5" />
								Downloads
							</a>
							<a
								href="/admin/users"
								class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
									.url.pathname === '/admin/users'
									? 'bg-accent text-accent-foreground border-l-2 border-primary'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							>
								<Users class="h-5 w-5" />
								Users
							</a>
							<a
								href="/admin/config"
								class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative {$page
									.url.pathname === '/admin/config'
									? 'bg-accent text-accent-foreground border-l-2 border-primary'
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
			<div class="border-border border-t p-4">
				<div class="mb-3 flex items-center gap-3">
					<div
						class="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-semibold"
					>
						{data.user?.displayName?.charAt(0).toUpperCase() || 'U'}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{data.user?.displayName}</p>
						<p class="text-muted-foreground truncate text-xs">{data.user?.email}</p>
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
				class="hover:bg-accent fixed top-6 left-6 z-50 rounded-md p-2 lg:hidden"
				onclick={() => {
					sidebarOpen = true;
				}}
				aria-label="Open menu"
			>
				<Menu class="h-6 w-6" />
			</button>
		{/if}

		<!-- Notifications button (top right) -->
		<button class="hover:bg-accent fixed top-6 right-6 z-50 rounded-md p-2">
			<Bell class="h-5 w-5" />
			<span
				class="bg-destructive absolute top-1 right-1 h-2 w-2 rounded-full"
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
		class="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
		onclick={() => {
			sidebarOpen = false;
		}}
		aria-label="Close sidebar"
	></button>
{/if}

<!-- Toast notifications -->
<Toast />
