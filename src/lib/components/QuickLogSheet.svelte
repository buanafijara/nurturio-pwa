<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import ActivityForm from '$lib/components/ActivityForm.svelte';
	import { activityLabel, type ActivityType } from '$lib/activity-types';
	import type { Id } from '$lib/convex';

	let {
		open = $bindable(false),
		type,
		babyId
	}: {
		open: boolean;
		type: ActivityType | null;
		babyId: Id<'babies'> | null;
	} = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content
		side="bottom"
		class="max-h-[90dvh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
	>
		{#if type && babyId}
			<Sheet.Header>
				<Sheet.Title>{activityLabel(type)}</Sheet.Title>
			</Sheet.Header>
			<div class="px-4">
				{#key `${type}-${open}`}
					<ActivityForm {type} {babyId} onsaved={() => (open = false)} />
				{/key}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
