<script lang="ts">
	import { goto } from '$app/navigation';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();

	const auth = useAuth();

	$effect(() => {
		if (!auth.isLoading && auth.isAuthenticated) goto('/');
	});
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
	<header class="text-center">
		<h1 class="text-primary text-3xl font-bold">{m.app_name()}</h1>
		<p class="text-muted-foreground mt-2 text-sm">{m.auth_tagline()}</p>
	</header>
	{@render children()}
</div>
