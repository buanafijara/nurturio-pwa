<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { m } from '$lib/paraglide/messages';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Download, X } from '@lucide/svelte';

	const DISMISS_KEY = 'nurturio:installDismissed';
	const VISITS_KEY = 'nurturio:visits';

	type BeforeInstallPromptEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	};

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let dismissed = $state(browser ? localStorage.getItem(DISMISS_KEY) === '1' : true);
	let visits = $state(0);
	let isIos = $state(false);
	let standalone = $state(true);

	onMount(() => {
		visits = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
		localStorage.setItem(VISITS_KEY, String(visits));
		isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
		standalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);

		const handler = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
		};
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	});

	// Show after the 2nd visit, when not installed and not dismissed.
	const show = $derived(
		!standalone && !dismissed && visits >= 2 && (deferredPrompt !== null || isIos)
	);

	async function install() {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const choice = await deferredPrompt.userChoice;
		if (choice.outcome === 'accepted') dismiss();
	}

	function dismiss() {
		dismissed = true;
		localStorage.setItem(DISMISS_KEY, '1');
	}
</script>

{#if show}
	<Card.Root>
		<Card.Content class="flex flex-col gap-3">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="font-semibold">{m.install_title()}</p>
					<p class="text-muted-foreground text-sm">
						{deferredPrompt ? m.install_body() : m.install_ios_hint()}
					</p>
				</div>
				<Button variant="ghost" size="icon" onclick={dismiss} aria-label={m.install_dismiss()}>
					<X class="size-4" />
				</Button>
			</div>
			{#if deferredPrompt}
				<Button class="min-h-11" onclick={install}>
					<Download class="size-4" />
					{m.install_button()}
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
