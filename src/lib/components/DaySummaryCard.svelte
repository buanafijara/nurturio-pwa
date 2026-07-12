<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api, type Id } from '$lib/convex';
	import { activityIcons } from '$lib/activity-types';
	import { dayBounds, formatAgo, formatDuration, pastDayBounds } from '$lib/utils/time';
	import { m } from '$lib/paraglide/messages';
	import * as Card from '$lib/components/ui/card';

	let { babyId }: { babyId: Id<'babies'> } = $props();

	// Ticks every 30s: refreshes "time since last feed" and rolls the day
	// window over midnight.
	let now = $state(Date.now());
	$effect(() => {
		const interval = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(interval);
	});

	const summary = useQuery(api.activities.daySummary, () => ({
		babyId,
		...dayBounds(new Date(now))
	}));
	const lastFeed = useQuery(api.activities.lastOfType, () => ({
		babyId,
		type: 'feed' as const
	}));
	const targets = useQuery(api.activityTargets.list, () => ({ babyId }));

	// Weekly range — needed only when there are weekly targets.
	const weekDays = pastDayBounds(7);
	const weekRange = useQuery(api.activities.rangeSummary, () => ({ babyId, days: weekDays }));

	// Compute weekly totals from rangeSummary
	const weekTotals = $derived.by(() => {
		const data = weekRange.data;
		if (!data) return null;
		return {
			feedCount: data.reduce((s, d) => s + d.feedCount, 0),
			totalMl: data.reduce((s, d) => s + d.totalMl, 0),
			sleepMin: data.reduce((s, d) => s + d.sleepMin, 0),
			diaperCount: data.reduce((s, d) => s + d.diapers.wet + d.diapers.dirty + d.diapers.mixed, 0),
			solidCount: data.reduce((s, d) => s + d.solidCount, 0),
			customCounts: data.reduce(
				(acc, d) => {
					for (const [k, v] of Object.entries(d.customCounts)) {
						acc[k] = (acc[k] ?? 0) + v;
					}
					return acc;
				},
				{} as Record<string, number>
			)
		};
	});

	// Given a target and today's summary, compute actual value (0 if unknown).
	function getActual(t: { activityType: string; metric: string; customTypeId?: string }, s: NonNullable<typeof summary.data>): number {
		if (t.activityType === 'feed') {
			return t.metric === 'ml' ? s.totalMl : s.feedCount;
		}
		if (t.activityType === 'sleep') return s.sleepMin;
		if (t.activityType === 'diaper') return s.diapers.wet + s.diapers.dirty + s.diapers.mixed;
		if (t.activityType === 'solid') return s.solidCount;
		if (t.activityType === 'custom' && t.customTypeId) return s.customCounts[t.customTypeId] ?? 0;
		return 0;
	}

	function getWeekActual(t: { activityType: string; metric: string; customTypeId?: string }): number {
		if (!weekTotals) return 0;
		if (t.activityType === 'feed') return t.metric === 'ml' ? weekTotals.totalMl : weekTotals.feedCount;
		if (t.activityType === 'sleep') return weekTotals.sleepMin;
		if (t.activityType === 'diaper') return weekTotals.diaperCount;
		if (t.activityType === 'solid') return weekTotals.solidCount;
		if (t.activityType === 'custom' && t.customTypeId) return weekTotals.customCounts[t.customTypeId] ?? 0;
		return 0;
	}

	// Progress bar colour: green ≥ 100%, amber 50–99%, red < 50%.
	function progressColor(ratio: number): string {
		if (ratio >= 1) return 'bg-green-500';
		if (ratio >= 0.5) return 'bg-amber-400';
		return 'bg-red-400';
	}

	// Return target for a given activity type (daily only) if one exists.
	function dailyTarget(activityType: string, metric?: string) {
		return (targets.data ?? []).find(
			(t) => t.period === 'daily' && t.activityType === activityType && (!metric || t.metric === metric)
		);
	}

	function formatTarget(t: { metric: string; targetValue: number }): string {
		if (t.metric === 'ml') return `${t.targetValue} ml`;
		if (t.metric === 'min') return `${Math.round(t.targetValue / 60 * 10) / 10}h`;
		return `${t.targetValue}×`;
	}

	const weeklyTargets = $derived((targets.data ?? []).filter((t) => t.period === 'weekly'));
	const hasWeeklyTargets = $derived(weeklyTargets.length > 0);

	const FeedIcon = activityIcons.feed;
	const DiaperIcon = activityIcons.diaper;
	const SleepIcon = activityIcons.sleep;
	const SpitUpIcon = activityIcons.spit_up;
	const SolidIcon = activityIcons.solid;
</script>

{#snippet progressBar(ratio: number)}
	<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10">
		<div
			class="h-full rounded-full transition-all {progressColor(ratio)}"
			style="width: {Math.min(ratio * 100, 100).toFixed(1)}%"
		></div>
	</div>
{/snippet}

<Card.Root>
	<Card.Header>
		<Card.Title>{m.summary_today()}</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{#if summary.data}
			{@const s = summary.data}
			{@const feedCountTarget = dailyTarget('feed', 'count')}
			{@const feedMlTarget = dailyTarget('feed', 'ml')}
			{@const feedTarget = feedMlTarget ?? feedCountTarget}
			{@const diaperTarget = dailyTarget('diaper')}
			{@const sleepTarget = dailyTarget('sleep')}
			{@const solidTarget = dailyTarget('solid')}
			<div class="grid grid-cols-2 gap-3">
				<!-- Feeds -->
				<div class="bg-secondary/60 flex flex-col gap-1 rounded-xl p-3">
					<FeedIcon class="text-primary size-5" />
					<p class="text-xl font-bold">
						{s.feedCount}
						<span class="text-muted-foreground text-sm font-normal">{m.summary_feeds_unit()}</span>
					</p>
					<p class="text-muted-foreground text-xs">
						{#if s.totalMl > 0}{s.totalMl} ml{/if}
						{#if s.totalMl > 0 && s.breastMin > 0}&nbsp;·&nbsp;{/if}
						{#if s.breastMin > 0}{m.summary_nursing({ min: s.breastMin })}{/if}
					</p>
					{#if feedTarget}
						{@const actual = getActual(feedTarget, s)}
						{@const ratio = actual / feedTarget.targetValue}
						{@render progressBar(ratio)}
						<p class="text-muted-foreground text-xs">{actual} / {formatTarget(feedTarget)}</p>
					{/if}
				</div>

				<!-- Diapers -->
				<div class="bg-secondary/60 flex flex-col gap-1 rounded-xl p-3">
					<DiaperIcon class="text-primary size-5" />
					<p class="text-xl font-bold">
						{s.diapers.wet + s.diapers.dirty + s.diapers.mixed}
						<span class="text-muted-foreground text-sm font-normal">{m.summary_diapers_unit()}</span>
					</p>
					<p class="text-muted-foreground text-xs">
						💧 {s.diapers.wet + s.diapers.mixed} · 💩 {s.diapers.dirty + s.diapers.mixed}
					</p>
					{#if diaperTarget}
						{@const actual = getActual(diaperTarget, s)}
						{@render progressBar(actual / diaperTarget.targetValue)}
						<p class="text-muted-foreground text-xs">{actual} / {formatTarget(diaperTarget)}</p>
					{/if}
				</div>

				<!-- Sleep -->
				<div class="bg-secondary/60 flex flex-col gap-1 rounded-xl p-3">
					<SleepIcon class="text-primary size-5" />
					<p class="text-xl font-bold">{formatDuration(s.sleepMin)}</p>
					<p class="text-muted-foreground text-xs">{m.activity_sleep()}</p>
					{#if sleepTarget}
						{@const actual = getActual(sleepTarget, s)}
						{@render progressBar(actual / sleepTarget.targetValue)}
						<p class="text-muted-foreground text-xs">{formatDuration(actual)} / {formatTarget(sleepTarget)}</p>
					{/if}
				</div>

				<!-- Wellness -->
				<div class="bg-secondary/60 flex flex-col gap-1 rounded-xl p-3">
					<SpitUpIcon class="text-primary size-5" />
					<p class="text-xl font-bold">
						{s.spitUps + s.vomits}
						<span class="text-muted-foreground text-sm font-normal">{m.summary_events_unit()}</span>
					</p>
					<p class="text-muted-foreground text-xs">
						{m.activity_spit_up()}
						{s.spitUps} · {m.activity_vomit()}
						{s.vomits}
					</p>
				</div>

				<!-- Solids -->
				<div class="bg-secondary/60 col-span-2 flex flex-col gap-1 rounded-xl p-3">
					<SolidIcon class="text-primary size-5" />
					<p class="text-xl font-bold">
						{s.solidCount}
						<span class="text-muted-foreground text-sm font-normal">{m.summary_solid({ count: s.solidCount })}</span>
					</p>
					<p class="text-muted-foreground text-xs">{m.activity_solid()}</p>
					{#if solidTarget}
						{@const actual = getActual(solidTarget, s)}
						{@render progressBar(actual / solidTarget.targetValue)}
						<p class="text-muted-foreground text-xs">{actual} / {formatTarget(solidTarget)}</p>
					{/if}
				</div>
			</div>

			<!-- Daily custom-type targets -->
			{@const dailyCustomTargets = (targets.data ?? []).filter(
				(t) => t.period === 'daily' && t.activityType === 'custom'
			)}
			{#if dailyCustomTargets.length > 0}
				<div class="flex flex-col gap-2">
					{#each dailyCustomTargets as t (t._id)}
						{@const actual = getActual(t, s)}
						{@const ratio = actual / t.targetValue}
						<div class="bg-secondary/60 rounded-xl p-3">
							<div class="flex items-center justify-between">
								<span class="font-medium">{t.customTypeName ?? 'Custom'}</span>
								<span class="text-muted-foreground text-sm">{actual} / {formatTarget(t)}</span>
							</div>
							{@render progressBar(ratio)}
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- Weekly goals -->
		{#if hasWeeklyTargets && weekTotals}
			<div class="flex flex-col gap-2">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">This week</p>
				<div class="flex flex-wrap gap-2">
					{#each weeklyTargets as t (t._id)}
						{@const actual = getWeekActual(t)}
						{@const done = actual >= t.targetValue}
						<div class="bg-secondary/60 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
							<span class={done ? 'text-green-600' : 'text-muted-foreground'}>
								{#if t.activityType === 'custom'}
									{t.customTypeName ?? 'Custom'}
								{:else}
									{t.activityType}
								{/if}
							</span>
							<span class="font-medium {done ? 'text-green-600' : ''}">{actual}/{t.targetValue}</span>
							{#if done}<span class="text-green-500">✓</span>{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if lastFeed.data}
			<p class="text-muted-foreground text-sm">
				{m.last_feed_ago({ ago: formatAgo(lastFeed.data.occurredAt, now) })}
			</p>
		{/if}
	</Card.Content>
</Card.Root>
