<script lang="ts">
	import {
		createSvelteAuthClient,
		type AuthClient
	} from '@mmailaender/convex-better-auth-svelte/svelte';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import PwaShell from '$lib/components/PwaShell.svelte';
	import { authClient } from '$lib/auth-client';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const convexUrl = PUBLIC_CONVEX_URL;

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
