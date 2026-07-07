<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { WifiOff } from '@lucide/svelte';

	// Offline banner
	let online = $state(browser ? navigator.onLine : true);

	// Service-worker update prompt ("prompt" registerType: never auto-reload).
	onMount(() => {
		const setOnline = () => (online = true);
		const setOffline = () => (online = false);
		window.addEventListener('online', setOnline);
		window.addEventListener('offline', setOffline);

		import('virtual:pwa-register')
			.then(({ registerSW }) => {
				const updateSW = registerSW({
					onNeedRefresh() {
						toast(m.update_available(), {
							duration: Infinity,
							action: { label: m.update_reload(), onClick: () => updateSW(true) }
						});
					}
				});
			})
			.catch(() => {
				/* SW disabled in dev */
			});

		return () => {
			window.removeEventListener('online', setOnline);
			window.removeEventListener('offline', setOffline);
		};
	});
</script>

{#if !online}
	<div
		class="bg-destructive text-white fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm font-medium"
		role="status"
	>
		<WifiOff class="size-4" />
		{m.offline_banner()}
	</div>
{/if}
