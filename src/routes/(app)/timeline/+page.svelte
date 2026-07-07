<script lang="ts">
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { ACTIVITY_TYPES, activityLabel, type ActivityType } from '$lib/activity-types';
	import TimelineList from '$lib/components/TimelineList.svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	let filter = $state<ActivityType | null>(null);
</script>

<div class="flex flex-col gap-4">
	<h1 class="pt-2 text-2xl font-bold">{m.timeline_title()}</h1>

	<div class="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
		{#each [null, ...ACTIVITY_TYPES] as type (type ?? 'all')}
			<button
				class={cn(
					'min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
					filter === type
						? 'border-primary bg-primary text-primary-foreground'
						: 'bg-card text-muted-foreground'
				)}
				onclick={() => (filter = type)}
			>
				{type === null ? m.filter_all() : activityLabel(type)}
			</button>
		{/each}
	</div>

	{#if selectedBaby.id}
		{#key `${selectedBaby.id}-${filter}`}
			<TimelineList babyId={selectedBaby.id} type={filter} />
		{/key}
	{/if}
</div>
