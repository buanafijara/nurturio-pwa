<script lang="ts">
	import { goto } from '$app/navigation';
	import { useConvexClient } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { uploadFile } from '$lib/upload';
	import { m } from '$lib/paraglide/messages';
	import BabyForm from '$lib/components/BabyForm.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { LoaderCircle } from '@lucide/svelte';

	const client = useConvexClient();

	let busy = $state(false);
	let joinCode = $state('');

	async function createBaby(data: {
		name: string;
		dateOfBirth: string;
		sex: 'male' | 'female';
		file: File | null;
	}) {
		busy = true;
		try {
			const photoStorageId = data.file ? await uploadFile(client, data.file) : undefined;
			const babyId = await client.mutation(api.babies.create, {
				name: data.name,
				dateOfBirth: data.dateOfBirth,
				sex: data.sex,
				photoStorageId
			});
			selectedBaby.select(babyId);
			goto('/');
		} catch {
			toast.error(m.error_generic());
		} finally {
			busy = false;
		}
	}

	async function join(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const babyId = await client.mutation(api.invites.redeem, { code: joinCode });
			selectedBaby.select(babyId);
			toast.success(m.invite_redeemed());
			goto('/');
		} catch {
			toast.error(m.invite_invalid());
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-6 pt-6">
	<header class="text-center">
		<h1 class="text-2xl font-bold">{m.onboarding_title()}</h1>
		<p class="text-muted-foreground mt-1 text-sm">{m.onboarding_subtitle()}</p>
	</header>

	<Tabs.Root value="create">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="create">{m.onboarding_create_tab()}</Tabs.Trigger>
			<Tabs.Trigger value="join">{m.onboarding_join_tab()}</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="create" class="pt-4">
			<BabyForm submitLabel={m.create_baby_submit()} {busy} onsubmit={createBaby} />
		</Tabs.Content>

		<Tabs.Content value="join" class="pt-4">
			<form class="flex flex-col gap-4" onsubmit={join}>
				<div class="flex flex-col gap-1.5">
					<Label for="join-code">{m.join_code_label()}</Label>
					<Input
						id="join-code"
						type="text"
						required
						bind:value={joinCode}
						class="min-h-12 text-center font-mono text-lg tracking-widest uppercase"
						autocomplete="off"
						spellcheck="false"
					/>
				</div>
				<Button type="submit" class="min-h-12 w-full" disabled={busy || !joinCode.trim()}>
					{#if busy}
						<LoaderCircle class="size-4 animate-spin" />
					{/if}
					{m.join_submit()}
				</Button>
			</form>
		</Tabs.Content>
	</Tabs.Root>
</div>
