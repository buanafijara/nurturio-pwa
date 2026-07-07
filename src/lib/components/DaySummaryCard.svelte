<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api, type Id } from '$lib/convex';
	import { activityIcons } from '$lib/activity-types';
	import { dayBounds, formatAgo, formatDuration } from '$lib/utils/time';
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

	const FeedIcon = activityIcons.feed;
	const DiaperIcon = activityIcons.diaper;
	const SleepIcon = activityIcons.sleep;
	const SpitUpIcon = activityIcons.spit_up;
	const SolidIcon = activityIcons.solid;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.summary_today()}</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{#if summary.data}
			{@const s = summary.data}
			<div class="grid grid-cols-2 gap-3">
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
				</div>
				<div class="bg-secondary/60 flex flex-col gap-1 rounded-xl p-3">
					<DiaperIcon class="text-primary size-5" />
					<p class="text-xl font-bold">
						{s.diapers.wet + s.diapers.dirty + s.diapers.mixed}
						<span class="text-muted-foreground text-sm font-normal">{m.summary_diapers_unit()}</span
						>
					</p>
					<p class="text-muted-foreground text-xs">
						💧 {s.diapers.wet + s.diapers.mixed} · 💩 {s.diapers.dirty + s.diapers.mixed}
					</p>
				</div>
				<div class="bg-secondary/60 flex flex-col gap-1 rounded-xl p-3">
					<SleepIcon class="text-primary size-5" />
					<p class="text-xl font-bold">{formatDuration(s.sleepMin)}</p>
					<p class="text-muted-foreground text-xs">{m.activity_sleep()}</p>
				</div>
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
				<div class="bg-secondary/60 col-span-2 flex flex-col gap-1 rounded-xl p-3">
					<SolidIcon class="text-primary size-5" />
					<p class="text-xl font-bold">
						{s.solidCount}
						<span class="text-muted-foreground text-sm font-normal">{m.summary_solid({ count: s.solidCount })}</span>
					</p>
					<p class="text-muted-foreground text-xs">{m.activity_solid()}</p>
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
