<script lang="ts">
	import { goto } from '$app/navigation';
	import { useConvexClient } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { uploadFile } from '$lib/upload';
	import { m } from '$lib/paraglide/messages';
	import BabyForm from '$lib/components/BabyForm.svelte';

	const client = useConvexClient();

	let busy = $state(false);

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
		} catch (err) {
			console.error('create baby error:', err);
			toast.error(m.error_generic());
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<h1 class="pt-2 text-2xl font-bold">{m.add_baby()}</h1>
	<BabyForm submitLabel={m.create_baby_submit()} {busy} onsubmit={createBaby} />
</div>
