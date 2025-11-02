<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';

	const error = $derived($page.url.searchParams.get('error'));

	const errorMessages: Record<string, string> = {
		auth_failed: 'Authentication failed. Please try again.',
		invalid_state: 'Invalid authentication state. Please try again.',
		unauthorized: 'You are not authorized to access this application.'
	};
</script>

<svelte:head>
	<title>Login - Bookrequestarr</title>
</svelte:head>

<div class="dark bg-background flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-md p-8">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold">📚 Bookrequestarr</h1>
			<p class="text-muted-foreground">Request your favorite books</p>
		</div>

		{#if error}
			<div class="bg-destructive/10 text-destructive mb-6 rounded-md p-4 text-sm">
				{errorMessages[error] || 'An error occurred. Please try again.'}
			</div>
		{/if}

		<form action="/api/auth/login" method="get">
			<Button type="submit" class="w-full" size="lg">Sign in with OIDC</Button>
		</form>

		<p class="text-muted-foreground mt-6 text-center text-sm">
			You need to be a member of the authorized group to access this application.
		</p>
	</Card>
</div>
