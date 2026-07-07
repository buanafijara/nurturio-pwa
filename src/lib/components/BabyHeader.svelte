<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { formatAge } from '$lib/utils/age';
	import * as Avatar from '$lib/components/ui/avatar';
	import { m } from '$lib/paraglide/messages';
	import { ChevronRight, Plus } from '@lucide/svelte';

	const babies = useQuery(api.babies.listMine, {});
	const baby = $derived(babies.data?.find((b) => b._id === selectedBaby.id));
</script>

{#if baby}
	<div class="flex flex-col gap-3">
		<a href="/baby/settings" class="bg-card flex items-center gap-3 rounded-xl border p-3">
			<Avatar.Root class="ring-baby-accent size-12 ring-2 ring-offset-2">
				<Avatar.Image src={baby.photoUrl} alt={baby.name} class="object-cover" />
				<Avatar.Fallback class="bg-baby-accent-subtle text-baby-accent font-semibold"
					>{baby.name.slice(0, 2).toUpperCase()}</Avatar.Fallback
				>
			</Avatar.Root>
			<div class="min-w-0 flex-1">
				<p class="truncate text-lg font-semibold">{baby.name}</p>
				<p class="text-muted-foreground text-sm">{formatAge(baby.dateOfBirth)}</p>
			</div>
			<ChevronRight class="text-muted-foreground size-5" />
		</a>

		{#if (babies.data?.length ?? 0) > 1}
			<div class="flex gap-2 overflow-x-auto">
				{#each babies.data ?? [] as candidate (candidate._id)}
					<button
						class={[
							'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
							candidate._id === selectedBaby.id
								? 'border-baby-accent bg-baby-accent text-baby-accent-foreground'
								: 'bg-card text-muted-foreground'
						]}
						onclick={() => selectedBaby.select(candidate._id)}
					>
						{candidate.name}
					</button>
				{/each}
				<a
					href="/baby/new"
					class="bg-card text-muted-foreground flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium"
					aria-label={m.add_baby()}
				>
					<Plus class="size-4" />
				</a>
			</div>
		{/if}
	</div>
{/if}
