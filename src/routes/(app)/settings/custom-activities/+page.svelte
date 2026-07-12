<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api, type Id } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Trash2 } from '@lucide/svelte';

	const client = useConvexClient();

	const customTypes = useQuery(api.customActivityTypes.list, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);

	let addOpen = $state(false);
	let newName = $state('');
	let newEmoji = $state('');
	let saving = $state(false);

	const SUGGESTED_EMOJIS = ['💊', '🤸', '🛁', '🌡️', '💉', '🥛', '🍼', '🧴', '🚗', '🏥', '😴', '🎵'];

	async function add() {
		if (!newName.trim() || !selectedBaby.id) return;
		saving = true;
		try {
			await client.mutation(api.customActivityTypes.create, {
				babyId: selectedBaby.id,
				name: newName.trim(),
				emoji: newEmoji || '📌'
			});
			toast.success('Activity type added');
			newName = '';
			newEmoji = '';
			addOpen = false;
		} catch {
			toast.error('Failed to add activity type');
		} finally {
			saving = false;
		}
	}

	async function remove(typeId: Id<'customActivityTypes'>) {
		try {
			await client.mutation(api.customActivityTypes.archive, { typeId });
			toast.success('Removed');
		} catch {
			toast.error('Failed to remove');
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between pt-2">
		<h1 class="text-2xl font-bold">Custom Activities</h1>
		<Button size="icon" onclick={() => (addOpen = true)} aria-label="Add">
			<Plus class="size-5" />
		</Button>
	</div>

	<p class="text-muted-foreground text-sm">
		Add your own activity types — vitamins, tummy time, baths, or anything else you track.
	</p>

	<Card.Root>
		<Card.Content class="flex flex-col divide-y p-0">
			{#if customTypes.data?.length === 0}
				<p class="text-muted-foreground px-4 py-6 text-center text-sm">
					No custom activities yet. Tap + to add one.
				</p>
			{/if}
			{#each customTypes.data ?? [] as ct (ct._id)}
				<div class="flex min-h-14 items-center gap-3 px-4">
					<span class="text-2xl">{ct.emoji}</span>
					<span class="flex-1 font-medium">{ct.name}</span>
					<button
						class="text-destructive p-2"
						onclick={() => remove(ct._id as Id<'customActivityTypes'>)}
						aria-label="Remove {ct.name}"
					>
						<Trash2 class="size-4" />
					</button>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>

<Dialog.Root bind:open={addOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>New Activity Type</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4 py-2">
			<div class="flex flex-col gap-2">
				<Label for="new-name">Name</Label>
				<Input
					id="new-name"
					placeholder="e.g. Vitamin D, Tummy Time"
					bind:value={newName}
					class="min-h-12"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label>Emoji Icon</Label>
				<div class="flex flex-wrap gap-2">
					{#each SUGGESTED_EMOJIS as emoji (emoji)}
						<button
							class={[
								'flex size-10 items-center justify-center rounded-lg border text-xl transition-colors',
								newEmoji === emoji ? 'border-primary bg-primary/10' : 'border-border'
							]}
							onclick={() => (newEmoji = emoji)}
							type="button"
						>
							{emoji}
						</button>
					{/each}
				</div>
				<Input
					placeholder="Or type any emoji"
					bind:value={newEmoji}
					maxlength={4}
					class="min-h-12"
				/>
			</div>
		</div>
		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (addOpen = false)}>Cancel</Button>
			<Button onclick={add} disabled={!newName.trim() || saving}>Add</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
