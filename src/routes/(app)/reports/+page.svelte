<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { pastDayBounds } from '$lib/utils/time';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import BarChart from '$lib/components/BarChart.svelte';
	import BabyHeader from '$lib/components/BabyHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';

	let period = $state<7 | 30>(7);
	const days = $derived(pastDayBounds(period));

	const range = useQuery(api.activities.rangeSummary, () =>
		selectedBaby.id ? { babyId: selectedBaby.id, days } : 'skip'
	);

	const locale = getLocale();

	function shortLabel(dayStartMs: number): string {
		const d = new Date(dayStartMs);
		if (period === 7) {
			return d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2);
		}
		return d.toLocaleDateString(locale, { day: 'numeric' });
	}

	const feedData = $derived(range.data?.map((d) => d.feedCount) ?? []);
	const feedLabels = $derived(range.data?.map((d) => shortLabel(d.dayStartMs)) ?? []);

	const totalFeeds = $derived(feedData.reduce((s, v) => s + v, 0));
	const avgFeeds = $derived(days.length > 0 ? (totalFeeds / days.length).toFixed(1) : '0');

	const totalBreastMin = $derived(range.data?.reduce((s, d) => s + d.breastMin, 0) ?? 0);
	const avgBreastMin = $derived(
		days.length > 0 ? Math.round(totalBreastMin / days.length) : 0
	);

	const totalBottleMl = $derived(range.data?.reduce((s, d) => s + d.totalMl, 0) ?? 0);
	const avgBottleMl = $derived(
		days.length > 0 ? Math.round(totalBottleMl / days.length) : 0
	);

	const hasData = $derived(totalFeeds > 0);
</script>

<div class="flex flex-col gap-6">
	<header class="pt-2">
		<h1 class="text-2xl font-bold">{m.reports_title()}</h1>
	</header>

	<BabyHeader />

	<Tabs.Root
		value={String(period)}
		onValueChange={(v) => (period = Number(v) as 7 | 30)}
	>
		<Tabs.List class="w-full">
			<Tabs.Trigger value="7" class="flex-1">{m.reports_period_7d()}</Tabs.Trigger>
			<Tabs.Trigger value="30" class="flex-1">{m.reports_period_30d()}</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.reports_feeding()}</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if !selectedBaby.id || range.data === undefined}
				<div class="bg-secondary/40 h-[100px] animate-pulse rounded-md"></div>
			{:else if !hasData}
				<p class="text-muted-foreground text-sm">{m.reports_no_data()}</p>
			{:else}
				<BarChart data={feedData} labels={feedLabels} />
				<div class="flex flex-wrap gap-2">
					<span class="bg-secondary rounded-full px-3 py-1 text-xs">
						{m.reports_avg_feeds({ n: avgFeeds })}
					</span>
					{#if totalBreastMin > 0}
						<span class="bg-secondary rounded-full px-3 py-1 text-xs">
							{m.reports_avg_nursing({ min: avgBreastMin })}
						</span>
					{/if}
					{#if totalBottleMl > 0}
						<span class="bg-secondary rounded-full px-3 py-1 text-xs">
							{m.reports_avg_bottle({ ml: avgBottleMl })}
						</span>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
