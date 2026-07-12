<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import {
		ACTIVITY_TYPES,
		activityIcons,
		activityLabel,
		type ActivityType
	} from '$lib/activity-types';
	import { goto } from '$app/navigation';
	import BabyHeader from '$lib/components/BabyHeader.svelte';
	import DaySummaryCard from '$lib/components/DaySummaryCard.svelte';
	import InstallCard from '$lib/components/InstallCard.svelte';
	import QuickLogSheet from '$lib/components/QuickLogSheet.svelte';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { toast } from 'svelte-sonner';
	import { Moon } from '@lucide/svelte';

	const client = useConvexClient();
	const babies = useQuery(api.babies.listMine, {});
	const baby = $derived(babies.data?.find((b) => b._id === selectedBaby.id));

	const customTypes = useQuery(api.customActivityTypes.list, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);

	const lastSleep = useQuery(api.activities.lastOfType, () =>
		selectedBaby.id ? { babyId: selectedBaby.id, type: 'sleep' as const } : 'skip'
	);
	const sleeping = $derived(
		lastSleep.data?.type === 'sleep' && lastSleep.data.endedAt === undefined ? lastSleep.data : null
	);

	let sheetOpen = $state(false);
	let sheetType = $state<ActivityType | null>(null);

	function openLog(type: ActivityType) {
		sheetType = type;
		sheetOpen = true;
	}

	function openCustomLog(typeId: string) {
		goto(`/log/custom?typeId=${typeId}`);
	}

	async function wake() {
		if (!sleeping) return;
		try {
			await client.mutation(api.activities.update, {
				activityId: sleeping._id,
				occurredAt: sleeping.occurredAt,
				note: sleeping.note,
				data: { type: 'sleep', endedAt: Date.now() }
			});
			toast.success(m.logged_toast());
		} catch {
			toast.error(m.error_generic());
		}
	}

	function greeting(): string {
		const hour = new Date().getHours();
		if (hour < 4) return m.home_greeting_night();
		if (hour < 11) return m.home_greeting_morning();
		if (hour < 15) return m.home_greeting_afternoon();
		if (hour < 22) return m.home_greeting_evening();
		return m.home_greeting_night();
	}
</script>

<div class="flex flex-col gap-6">
	<header class="pt-2">
		<h1 class="text-2xl font-bold">{greeting()}</h1>
		<p class="text-muted-foreground text-sm">{m.app_name()}</p>
	</header>

	<BabyHeader />

	{#if sleeping && baby}
		<div class="bg-secondary flex items-center gap-3 rounded-xl border p-4">
			<Moon class="text-primary size-6 shrink-0" />
			<div class="min-w-0 flex-1">
				<p class="font-medium">{m.asleep_banner({ name: baby.name })}</p>
				<p class="text-muted-foreground text-sm">
					{m.asleep_since({
						time: new Date(sleeping.occurredAt).toLocaleTimeString(getLocale(), {
							hour: '2-digit',
							minute: '2-digit'
						})
					})}
				</p>
			</div>
			<Button class="min-h-11" onclick={wake}>{m.wake_up()}</Button>
		</div>
	{/if}

	<section>
		<h2 class="mb-3 text-lg font-semibold">{m.home_quick_log()}</h2>
		<div class="grid grid-cols-2 gap-3">
			{#each ACTIVITY_TYPES as type (type)}
				{@const Icon = activityIcons[type]}
				<button
					class={[
						'bg-card text-card-foreground flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors active:scale-95 disabled:opacity-50',
						type === 'photo' ? 'col-span-2' : ''
					]}
					onclick={() => openLog(type)}
					disabled={!selectedBaby.id || (type === 'sleep' && sleeping !== null)}
				>
					<Icon class="text-primary size-7" />
					<span class="font-medium">{activityLabel(type)}</span>
				</button>
			{/each}
			{#each customTypes.data ?? [] as ct (ct._id)}
				<button
					class="bg-card text-card-foreground flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-colors active:scale-95 disabled:opacity-50"
					onclick={() => openCustomLog(ct._id)}
					disabled={!selectedBaby.id}
				>
					<span class="text-3xl leading-none">{ct.emoji}</span>
					<span class="font-medium">{ct.name}</span>
				</button>
			{/each}
		</div>
	</section>

	{#if selectedBaby.id}
		<DaySummaryCard babyId={selectedBaby.id} />
	{/if}

	<InstallCard />
</div>

<QuickLogSheet bind:open={sheetOpen} type={sheetType} babyId={selectedBaby.id} />
