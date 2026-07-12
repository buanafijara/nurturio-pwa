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
	const targets = useQuery(api.activityTargets.list, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);

	const locale = getLocale();

	function shortLabel(dayStartMs: number): string {
		const d = new Date(dayStartMs);
		if (period === 7) {
			return d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2);
		}
		return d.toLocaleDateString(locale, { day: 'numeric' });
	}

	const dayLabels = $derived(range.data?.map((d) => shortLabel(d.dayStartMs)) ?? []);

	// Feeding — bottle ml per day
	const mlData = $derived(range.data?.map((d) => d.totalMl) ?? []);
	const hasFeedData = $derived(mlData.some((v) => v > 0));

	// Sleep — hours per day (1 decimal)
	const sleepData = $derived(range.data?.map((d) => Math.round(d.sleepMin / 6) / 10) ?? []);
	const hasSleepData = $derived(sleepData.some((v) => v > 0));

	// Diapers — total per day with breakdown totals
	const diaperData = $derived(
		range.data?.map((d) => d.diapers.wet + d.diapers.dirty + d.diapers.mixed) ?? []
	);
	const totalWet = $derived(range.data?.reduce((s, d) => s + d.diapers.wet, 0) ?? 0);
	const totalDirty = $derived(range.data?.reduce((s, d) => s + d.diapers.dirty, 0) ?? 0);
	const totalMixed = $derived(range.data?.reduce((s, d) => s + d.diapers.mixed, 0) ?? 0);
	const hasDiaperData = $derived(diaperData.some((v) => v > 0));

	// Wellness — spit-up + vomit events per day
	const wellnessData = $derived(range.data?.map((d) => d.spitUps + d.vomits) ?? []);
	const hasWellnessData = $derived(wellnessData.some((v) => v > 0));

	const isLoading = $derived(!selectedBaby.id || range.data === undefined);

	// Daily target values for each chart (undefined = no target set).
	const feedMlTarget = $derived(
		targets.data?.find((t) => t.activityType === 'feed' && t.metric === 'ml' && t.period === 'daily')
			?.targetValue
	);
	const sleepTargetH = $derived(
		(() => {
			const t = targets.data?.find(
				(t) => t.activityType === 'sleep' && t.period === 'daily'
			);
			return t ? Math.round((t.targetValue / 60) * 10) / 10 : undefined;
		})()
	);
	const diaperTarget = $derived(
		targets.data?.find((t) => t.activityType === 'diaper' && t.period === 'daily')?.targetValue
	);
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
		<Card.Content>
			{#if isLoading}
				<div class="bg-secondary/40 h-[100px] animate-pulse rounded-md"></div>
			{:else if !hasFeedData}
				<p class="text-muted-foreground text-sm">{m.reports_no_data()}</p>
			{:else}
				<BarChart data={mlData} labels={dayLabels} formatter={(v) => `${v} ml`} target={feedMlTarget} />
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.reports_sleep()}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if isLoading}
				<div class="bg-secondary/40 h-[100px] animate-pulse rounded-md"></div>
			{:else if !hasSleepData}
				<p class="text-muted-foreground text-sm">{m.reports_no_data()}</p>
			{:else}
				<BarChart data={sleepData} labels={dayLabels} formatter={(v) => `${v}h`} target={sleepTargetH} />
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.reports_diapers()}</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if isLoading}
				<div class="bg-secondary/40 h-[100px] animate-pulse rounded-md"></div>
			{:else if !hasDiaperData}
				<p class="text-muted-foreground text-sm">{m.reports_no_data()}</p>
			{:else}
				<BarChart data={diaperData} labels={dayLabels} target={diaperTarget} />
				<div class="flex flex-wrap gap-2">
					{#if totalWet > 0}
						<span class="bg-secondary rounded-full px-3 py-1 text-xs"
							>{m.kind_wet()} {totalWet}</span
						>
					{/if}
					{#if totalDirty > 0}
						<span class="bg-secondary rounded-full px-3 py-1 text-xs"
							>{m.kind_dirty()} {totalDirty}</span
						>
					{/if}
					{#if totalMixed > 0}
						<span class="bg-secondary rounded-full px-3 py-1 text-xs"
							>{m.kind_mixed()} {totalMixed}</span
						>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.reports_wellness()}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if isLoading}
				<div class="bg-secondary/40 h-[100px] animate-pulse rounded-md"></div>
			{:else if !hasWellnessData}
				<p class="text-muted-foreground text-sm">{m.reports_no_data()}</p>
			{:else}
				<BarChart data={wellnessData} labels={dayLabels} />
			{/if}
		</Card.Content>
	</Card.Root>
</div>
