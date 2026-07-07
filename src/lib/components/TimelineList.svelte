<script lang="ts">
	import { usePaginatedQuery } from 'convex-svelte';
	import { api, type Doc, type Id } from '$lib/convex';
	import type { ActivityType } from '$lib/activity-types';
	import ActivityRow from '$lib/components/ActivityRow.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { History, LoaderCircle } from '@lucide/svelte';

	let { babyId, type = null }: { babyId: Id<'babies'>; type?: ActivityType | null } = $props();

	const timeline = usePaginatedQuery(
		api.activities.timeline,
		() => ({ babyId, type: type ?? undefined }),
		() => ({ initialNumItems: 25, keepPreviousData: true })
	);

	function startOfDay(d: Date): number {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	}

	function dayHeader(ms: number): string {
		const date = new Date(ms);
		const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
		if (diffDays === 0) return m.day_today();
		if (diffDays === 1) return m.day_yesterday();
		return date.toLocaleDateString(getLocale(), {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

	// Group the flat result list into [header, items] runs.
	const groups = $derived.by(() => {
		const out: { header: string; items: Doc<'activities'>[] }[] = [];
		for (const item of timeline.results) {
			const header = dayHeader(item.occurredAt);
			const last = out.at(-1);
			if (last && last.header === header) last.items.push(item);
			else out.push({ header, items: [item] });
		}
		return out;
	});

	// Infinite scroll sentinel
	function sentinel(node: HTMLElement) {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && timeline.status === 'CanLoadMore') {
				timeline.loadMore(25);
			}
		});
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

{#if timeline.status === 'LoadingFirstPage'}
	<div class="flex justify-center py-16">
		<LoaderCircle class="text-muted-foreground size-6 animate-spin" />
	</div>
{:else if timeline.results.length === 0}
	<div class="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
		<History class="size-10" />
		<p class="text-sm">{m.timeline_empty()}</p>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		{#each groups as group (group.header)}
			<h2
				class="bg-background/95 text-muted-foreground sticky top-0 z-10 py-1.5 text-sm font-semibold backdrop-blur"
			>
				{group.header}
			</h2>
			{#each group.items as activity (activity._id)}
				<ActivityRow {activity} />
			{/each}
		{/each}
	</div>
	<div use:sentinel class="h-8"></div>
	{#if timeline.status === 'LoadingMore'}
		<div class="flex justify-center py-2">
			<LoaderCircle class="text-muted-foreground size-5 animate-spin" />
		</div>
	{/if}
{/if}
