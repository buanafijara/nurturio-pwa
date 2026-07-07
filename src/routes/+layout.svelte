<script lang="ts">
	import {
		createSvelteAuthClient,
		type AuthClient
	} from '@mmailaender/convex-better-auth-svelte/svelte';
	import { browser } from '$app/environment';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import PwaShell from '$lib/components/PwaShell.svelte';
	import { authClient } from '$lib/auth-client';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// In dev, phones on the local network can't reach 127.0.0.1:3210 (the
	// Convex local process). Build the URL dynamically so it routes through
	// Vite's /convex-proxy, which forwards to 127.0.0.1:3210.
	const convexUrl =
		browser && import.meta.env.DEV
			? `${window.location.origin}/convex-proxy`
			: PUBLIC_CONVEX_URL;

	// Wires the Convex client (setupConvex) + Better Auth token exchange;
	// components consume it via useQuery/useConvexClient/useAuth.
	// Cast: the adapter's AuthClient type lags better-auth 1.6's useSession
	// inference; the runtime contract (peer range ^1.4.9) is unaffected.
	createSvelteAuthClient({
		authClient: authClient as unknown as AuthClient,
		convexUrl
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />
<Toaster position="top-center" />
<PwaShell />

{@render children()}
