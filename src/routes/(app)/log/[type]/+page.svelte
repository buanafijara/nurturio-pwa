<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api, type Id } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { activityLabel, isActivityType } from '$lib/activity-types';
	import ActivityForm from '$lib/components/ActivityForm.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';
	import { Trash2 } from '@lucide/svelte';

	const client = useConvexClient();

	const type = $derived(isActivityType(page.params.type!) ? page.params.type : null);
	const editId = $derived(page.url.searchParams.get('edit') as Id<'activities'> | null);
	const customTypeId = $derived(page.url.searchParams.get('typeId') as Id<'customActivityTypes'> | null);

	const existing = useQuery(api.activities.get, () => (editId ? { activityId: editId } : 'skip'));
	const customType = useQuery(api.customActivityTypes.get, () =>
		type === 'custom' && customTypeId ? { typeId: customTypeId } : 'skip'
	);

	const pageTitle = $derived.by(() => {
		if (type === 'custom') {
			return customType.data ? `${customType.data.emoji} ${customType.data.name}` : '…';
		}
		return type ? activityLabel(type) : '';
	});

	let confirmOpen = $state(false);

	function done() {
		goto(editId ? '/timeline' : '/');
	}

	async function remove() {
		if (!editId) return;
		try {
			await client.mutation(api.activities.remove, { activityId: editId });
			confirmOpen = false;
			done();
		} catch {
			toast.error(m.error_generic());
		}
	}
</script>

{#if type}
	<div class="flex flex-col gap-6">
		<div class="flex items-center justify-between pt-2">
			<h1 class="text-2xl font-bold">
				{editId ? m.edit_title() : ''}
				{pageTitle}
			</h1>
			{#if editId}
				<Button
					variant="ghost"
					size="icon"
					class="text-destructive"
					onclick={() => (confirmOpen = true)}
					aria-label={m.delete()}
				>
					<Trash2 class="size-5" />
				</Button>
			{/if}
		</div>

		{#if editId}
			{#if existing.data}
				{#key existing.data._id}
					<ActivityForm
						{type}
						babyId={existing.data.babyId}
						existing={existing.data}
						onsaved={done}
					/>
				{/key}
			{/if}
		{:else if selectedBaby.id}
			{#if type === 'custom'}
				{#if customType.data}
					<ActivityForm
						{type}
						babyId={selectedBaby.id}
						customTypeId={customType.data._id}
						customTypeName={customType.data.name}
						customTypeEmoji={customType.data.emoji}
						onsaved={done}
					/>
				{/if}
			{:else}
				<ActivityForm {type} babyId={selectedBaby.id} onsaved={done} />
			{/if}
		{/if}
	</div>

	<Dialog.Root bind:open={confirmOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{m.delete_confirm_title()}</Dialog.Title>
			</Dialog.Header>
			<Dialog.Footer class="gap-2">
				<Button variant="outline" onclick={() => (confirmOpen = false)}>{m.cancel()}</Button>
				<Button variant="destructive" onclick={remove}>{m.delete()}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
