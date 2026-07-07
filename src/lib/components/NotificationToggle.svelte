<script lang="ts">
	import { browser } from '$app/environment';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { Bell, BellOff } from '@lucide/svelte';
	import { api } from '$lib/convex';
	import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
	import { m } from '$lib/paraglide/messages';

	const client = useConvexClient();
	const status = useQuery(api.pushSubscriptions.getMyStatus, {});

	let busy = $state(false);

	function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
		const buffer = new ArrayBuffer(raw.length);
		const uint8 = new Uint8Array(buffer);
		for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
		return uint8;
	}

	async function enable() {
		if (!browser || !('Notification' in window) || !('serviceWorker' in navigator)) return;
		busy = true;
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') return;
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY)
			});
			const json = subscription.toJSON();
			await client.mutation(api.pushSubscriptions.save, {
				endpoint: subscription.endpoint,
				p256dh: json.keys!['p256dh'],
				auth: json.keys!['auth']
			});
		} finally {
			busy = false;
		}
	}

	async function disable() {
		if (!browser) return;
		busy = true;
		try {
			// Always remove from DB first so the toggle reflects reality even if
			// the browser no longer holds a matching subscription object.
			await client.mutation(api.pushSubscriptions.removeAll, {});
			// Best-effort browser unsubscribe (may return null if already gone).
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) await subscription.unsubscribe();
		} finally {
			busy = false;
		}
	}

	const isEnabled = $derived(status.data === true);
</script>

<button
	class="flex min-h-12 w-full items-center gap-3 disabled:opacity-50"
	onclick={isEnabled ? disable : enable}
	disabled={busy || status.data === undefined}
	aria-pressed={isEnabled}
>
	{#if isEnabled}
		<Bell class="text-primary size-5" />
	{:else}
		<BellOff class="text-muted-foreground size-5" />
	{/if}
	<span class="flex-1 text-left font-medium">{m.settings_notifications()}</span>
	<span
		class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors {isEnabled
			? 'bg-primary'
			: 'bg-input'}"
	>
		<span
			class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform {isEnabled
				? 'translate-x-5'
				: 'translate-x-0'}"
		></span>
	</span>
</button>
