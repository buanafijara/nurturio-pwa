<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api, type Id } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { ACTIVITY_TYPES, activityIcons, activityLabel, isBuiltinType } from '$lib/activity-types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from '@lucide/svelte';

	const client = useConvexClient();

	const targets = useQuery(api.activityTargets.list, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);
	const customTypes = useQuery(api.customActivityTypes.list, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);

	// ── Add dialog state ──────────────────────────────────────────────────────
	let addOpen = $state(false);
	let selectedType = $state<string>('feed');
	let selectedCustomTypeId = $state<string>('');
	let period = $state<'daily' | 'weekly'>('daily');
	let metric = $state<'count' | 'ml' | 'min'>('count');
	let targetValue = $state(1);
	let saving = $state(false);

	// Built-in types that make sense as targets (exclude photo)
	const TARGETABLE_TYPES = ACTIVITY_TYPES.filter((t) => t !== 'photo');

	// Determine available metrics for the selected activity type
	const availableMetrics = $derived.by((): Array<{ value: 'count' | 'ml' | 'min'; label: string }> => {
		if (selectedType === 'feed') {
			return [
				{ value: 'count', label: 'Times' },
				{ value: 'ml', label: 'Millilitres (ml)' }
			];
		}
		if (selectedType === 'sleep') {
			return [{ value: 'min', label: 'Hours' }];
		}
		return [{ value: 'count', label: 'Times' }];
	});

	// Reset metric when type changes. Do NOT read `metric` here — doing so
	// would cause the effect to re-run when the user picks a metric and
	// immediately reset their choice back to the default.
	$effect(() => {
		const defaultMetric = availableMetrics[0].value;
		metric = defaultMetric;
		if (selectedType === 'sleep') targetValue = 960; // 16 h default
		else targetValue = 1;
	});

	// Label helpers
	function metricLabel(m: string, val: number): string {
		if (m === 'ml') return `${val} ml`;
		if (m === 'min') return `${Math.round(val / 60 * 10) / 10} h`;
		return `${val}×`;
	}

	function typeLabel(t: typeof targets.data extends Array<infer U> ? U : never): string {
		if (t.activityType === 'custom') return t.customTypeName ?? 'Custom';
		if (isBuiltinType(t.activityType)) return activityLabel(t.activityType);
		return t.activityType;
	}

	function typeEmoji(t: typeof targets.data extends Array<infer U> ? U : never): string | null {
		if (t.activityType === 'custom') {
			const ct = customTypes.data?.find((c) => c._id === t.customTypeId);
			return ct?.emoji ?? null;
		}
		return null;
	}

	const daily = $derived((targets.data ?? []).filter((t) => t.period === 'daily'));
	const weekly = $derived((targets.data ?? []).filter((t) => t.period === 'weekly'));

	async function save() {
		if (!selectedBaby.id) return;
		saving = true;
		try {
			const customType =
				selectedType === 'custom'
					? customTypes.data?.find((c) => c._id === selectedCustomTypeId)
					: undefined;

			await client.mutation(api.activityTargets.set, {
				babyId: selectedBaby.id,
				activityType: selectedType,
				customTypeId: customType?._id as Id<'customActivityTypes'> | undefined,
				customTypeName: customType?.name,
				period,
				metric,
				targetValue
			});
			toast.success('Goal saved');
			addOpen = false;
		} catch {
			toast.error('Failed to save goal');
		} finally {
			saving = false;
		}
	}

	async function remove(targetId: Id<'activityTargets'>) {
		try {
			await client.mutation(api.activityTargets.remove, { targetId });
			toast.success('Goal removed');
		} catch {
			toast.error('Failed to remove');
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between pt-2">
		<h1 class="text-2xl font-bold">Goals</h1>
		<Button size="icon" onclick={() => (addOpen = true)} aria-label="Add goal">
			<Plus class="size-5" />
		</Button>
	</div>

	<p class="text-muted-foreground text-sm">
		Set minimum daily or weekly targets for any activity. Progress is shown on the home screen.
	</p>

	{#snippet targetList(list: typeof daily)}
		<Card.Root>
			<Card.Content class="flex flex-col divide-y p-0">
				{#if list.length === 0}
					<p class="text-muted-foreground px-4 py-6 text-center text-sm">No goals yet.</p>
				{/if}
				{#each list as t (t._id)}
					{@const emoji = typeEmoji(t)}
					<div class="flex min-h-14 items-center gap-3 px-4">
						{#if emoji}
							<span class="text-xl">{emoji}</span>
						{:else if isBuiltinType(t.activityType)}
							{@const Icon = activityIcons[t.activityType]}
							<Icon class="text-primary size-5" />
						{/if}
						<span class="flex-1 font-medium">{typeLabel(t)}</span>
						<span class="text-muted-foreground text-sm">{metricLabel(t.metric, t.targetValue)}</span>
						<button
							class="text-destructive p-2"
							onclick={() => remove(t._id as Id<'activityTargets'>)}
							aria-label="Remove goal"
						>
							<Trash2 class="size-4" />
						</button>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/snippet}

	<div class="flex flex-col gap-2">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Daily</h2>
		{@render targetList(daily)}
	</div>

	<div class="flex flex-col gap-2">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weekly</h2>
		{@render targetList(weekly)}
	</div>
</div>

<!-- Add goal dialog -->
<Dialog.Root bind:open={addOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>New Goal</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-4 py-2">
			<!-- Activity type -->
			<div class="flex flex-col gap-2">
				<Label>Activity</Label>
				<select
					bind:value={selectedType}
					class="border-input bg-background min-h-12 rounded-md border px-3 py-2 text-sm"
				>
					{#each TARGETABLE_TYPES as t (t)}
						<option value={t}>{activityLabel(t)}</option>
					{/each}
					{#if (customTypes.data ?? []).length > 0}
						<optgroup label="Custom">
							{#each customTypes.data ?? [] as ct (ct._id)}
								<option value="custom" onclick={() => (selectedCustomTypeId = ct._id)}>
									{ct.emoji} {ct.name}
								</option>
							{/each}
						</optgroup>
					{/if}
				</select>
				{#if selectedType === 'custom' && (customTypes.data ?? []).length > 0}
					<select
						bind:value={selectedCustomTypeId}
						class="border-input bg-background min-h-12 rounded-md border px-3 py-2 text-sm"
					>
						{#each customTypes.data ?? [] as ct (ct._id)}
							<option value={ct._id}>{ct.emoji} {ct.name}</option>
						{/each}
					</select>
				{/if}
			</div>

			<!-- Period -->
			<div class="flex flex-col gap-2">
				<Label>Period</Label>
				<div class="grid grid-cols-2 gap-2">
					<Button
						variant={period === 'daily' ? 'default' : 'outline'}
						class="min-h-12"
						onclick={() => (period = 'daily')}>Daily</Button
					>
					<Button
						variant={period === 'weekly' ? 'default' : 'outline'}
						class="min-h-12"
						onclick={() => (period = 'weekly')}>Weekly</Button
					>
				</div>
			</div>

			<!-- Metric (only shown when >1 option) -->
			{#if availableMetrics.length > 1}
				<div class="flex flex-col gap-2">
					<Label>Measure by</Label>
					<div class="grid grid-cols-2 gap-2">
						{#each availableMetrics as m (m.value)}
							<Button
								variant={metric === m.value ? 'default' : 'outline'}
								class="min-h-12"
								onclick={() => (metric = m.value)}>{m.label}</Button
							>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Target value -->
			<div class="flex flex-col gap-2">
				<Label for="target-value">
					Target {metric === 'ml' ? '(ml)' : metric === 'min' ? '(hours)' : '(times)'}
				</Label>
				{#if metric === 'min'}
					<!-- Sleep: input in hours, store as minutes -->
					<Input
						id="target-value"
						type="number"
						min="0.5"
						step="0.5"
						value={Math.round(targetValue / 60 * 10) / 10}
						oninput={(e) => (targetValue = Math.round(parseFloat((e.currentTarget as HTMLInputElement).value) * 60))}
						class="min-h-12"
					/>
				{:else}
					<Input
						id="target-value"
						type="number"
						min="1"
						step={metric === 'ml' ? 50 : 1}
						bind:value={targetValue}
						class="min-h-12"
					/>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (addOpen = false)}>Cancel</Button>
			<Button onclick={save} disabled={saving || targetValue <= 0}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
