<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { toast } from 'svelte-sonner';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { m } from '$lib/paraglide/messages';
	import TabBar from '$lib/components/TabBar.svelte';
	import { LoaderCircle } from '@lucide/svelte';

	const PENDING_INVITE_KEY = 'nurturio:pendingInviteCode';

	let { children } = $props();

	const auth = useAuth();
	const client = useConvexClient();
	const me = useQuery(api.users.me, {});
	const babies = useQuery(api.babies.listMine, {});

	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) goto('/sign-in');
	});

	// Create the app profile once the server confirms the session but no
	// profile exists yet (avoids racing the websocket token handshake).
	let ensured = false;
	$effect(() => {
		if (!ensured && me.data && me.data.profile === null) {
			ensured = true;
			client.mutation(api.users.ensureProfile, {});
		}
	});

	// Redeem an invite link the user opened (possibly before signing in).
	let redeeming = $state(false);
	$effect(() => {
		if (redeeming || !me.data?.profile) return;
		const code = localStorage.getItem(PENDING_INVITE_KEY);
		if (!code) return;
		redeeming = true;
		client
			.mutation(api.invites.redeem, { code })
			.then((babyId) => {
				selectedBaby.select(babyId);
				toast.success(m.invite_redeemed());
			})
			.catch(() => toast.error(m.invite_invalid()))
			.finally(() => {
				localStorage.removeItem(PENDING_INVITE_KEY);
				redeeming = false;
			});
	});

	// No babies → onboarding; otherwise keep a valid selection.
	$effect(() => {
		if (!me.data?.profile || babies.data === undefined || redeeming) return;
		if (babies.data.length === 0) {
			if (page.url.pathname !== '/onboarding' && !localStorage.getItem(PENDING_INVITE_KEY)) {
				goto('/onboarding');
			}
			return;
		}
		if (!selectedBaby.id || !babies.data.some((b) => b._id === selectedBaby.id)) {
			selectedBaby.select(babies.data[0]._id);
		}
		if (page.url.pathname === '/onboarding') goto('/');
	});

	const selectedBabyData = $derived(babies.data?.find((b) => b._id === selectedBaby.id));
	const babySex = $derived(selectedBabyData?.sex ?? '');
</script>

{#if auth.isAuthenticated}
	<div class="mx-auto flex min-h-dvh w-full max-w-md flex-col" data-baby-sex={babySex}>
		<main class="flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24">
			{@render children()}
		</main>
		<TabBar />
	</div>
{:else}
	<div class="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
		<LoaderCircle class="text-muted-foreground size-8 animate-spin" />
		{#if import.meta.env.DEV}
			<div class="rounded-lg bg-black/5 p-3 font-mono text-xs">
				<p>isLoading: {auth.isLoading}</p>
				<p>isAuthenticated: {auth.isAuthenticated}</p>
				<p>convex: {window?.location?.origin}/convex-proxy</p>
			</div>
		{/if}
	</div>
{/if}
