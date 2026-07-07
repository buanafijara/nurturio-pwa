<script lang="ts">
	import { goto } from '$app/navigation';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { uploadFile } from '$lib/upload';
	import { m } from '$lib/paraglide/messages';
	import BabyForm from '$lib/components/BabyForm.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Archive } from '@lucide/svelte';

	const client = useConvexClient();
	const baby = useQuery(api.babies.get, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);

	let busy = $state(false);
	let confirmOpen = $state(false);

	async function save(data: {
		name: string;
		dateOfBirth: string;
		sex: 'male' | 'female';
		file: File | null;
	}) {
		if (!selectedBaby.id) return;
		busy = true;
		try {
			const photoStorageId = data.file ? await uploadFile(client, data.file) : undefined;
			await client.mutation(api.babies.update, {
				babyId: selectedBaby.id,
				name: data.name,
				dateOfBirth: data.dateOfBirth,
				sex: data.sex,
				photoStorageId
			});
			toast.success(m.saved());
		} catch (err) {
			console.error('save baby error:', err);
			toast.error(m.error_generic());
		} finally {
			busy = false;
		}
	}

	async function archive() {
		if (!selectedBaby.id) return;
		try {
			await client.mutation(api.babies.archive, { babyId: selectedBaby.id });
			selectedBaby.clear();
			confirmOpen = false;
			goto('/');
		} catch {
			toast.error(m.error_generic());
		}
	}
</script>

<div class="flex flex-col gap-6">
	<h1 class="pt-2 text-2xl font-bold">{m.baby_settings_title()}</h1>

	{#if baby.data}
		{#key baby.data._id}
			<BabyForm
				initial={{
					name: baby.data.name,
					dateOfBirth: baby.data.dateOfBirth,
					sex: baby.data.sex,
					photoUrl: baby.data.photoUrl
				}}
				submitLabel={m.save()}
				{busy}
				onsubmit={save}
			/>
		{/key}

		{#if baby.data.role === 'owner'}
			<Button
				variant="outline"
				class="text-destructive min-h-12"
				onclick={() => (confirmOpen = true)}
			>
				<Archive class="size-4" />
				{m.archive_baby()}
			</Button>

			<Dialog.Root bind:open={confirmOpen}>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>{m.archive_confirm_title()}</Dialog.Title>
						<Dialog.Description>
							{m.archive_confirm_body({ name: baby.data.name })}
						</Dialog.Description>
					</Dialog.Header>
					<Dialog.Footer class="gap-2">
						<Button variant="outline" onclick={() => (confirmOpen = false)}>{m.cancel()}</Button>
						<Button variant="destructive" onclick={archive}>{m.archive_baby()}</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		{/if}
	{/if}
</div>
