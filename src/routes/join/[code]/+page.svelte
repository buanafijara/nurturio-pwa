<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LoaderCircle } from '@lucide/svelte';

	// Store the code and bounce to the app: the (app) layout redeems it once
	// the user is signed in (covers both signed-in and brand-new users).
	onMount(() => {
		localStorage.setItem('nurturio:pendingInviteCode', page.params.code!);
		goto('/', { replaceState: true });
	});
</script>

<div class="flex min-h-dvh items-center justify-center">
	<LoaderCircle class="text-muted-foreground size-8 animate-spin" />
</div>
