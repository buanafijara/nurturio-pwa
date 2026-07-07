<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api, type Doc, type Id } from '$lib/convex';
	import type { ActivityType } from '$lib/activity-types';
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import AmountStepper from '$lib/components/AmountStepper.svelte';
	import TimeAgoPicker from '$lib/components/TimeAgoPicker.svelte';
	import { Camera, LoaderCircle } from '@lucide/svelte';
	import { uploadFile } from '$lib/upload';

	type FeedMethod =
		'breast_left' | 'breast_right' | 'breast_both' | 'bottle_breastmilk' | 'bottle_formula';
	type DiaperKind = 'wet' | 'dirty' | 'mixed';
	type Severity = 'small' | 'medium' | 'large';

	let {
		type,
		babyId,
		existing = null,
		onsaved
	}: {
		type: ActivityType;
		babyId: Id<'babies'>;
		existing?: Doc<'activities'> | null;
		onsaved: () => void;
	} = $props();

	const client = useConvexClient();

	// "Same as last feed" defaults — only when creating a new feed entry.
	const lastFeed = useQuery(api.activities.lastOfType, () =>
		type === 'feed' && !existing ? { babyId, type: 'feed' as const } : 'skip'
	);

	// svelte-ignore state_referenced_locally
	let occurredAt = $state(existing?.occurredAt ?? Date.now());
	// svelte-ignore state_referenced_locally
	let note = $state(existing?.note ?? '');

	// Feed
	// svelte-ignore state_referenced_locally
	let method = $state<FeedMethod>(existing?.type === 'feed' ? existing.method : 'breast_both');
	// svelte-ignore state_referenced_locally
	let amountMl = $state(existing?.type === 'feed' ? (existing.amountMl ?? 60) : 60);
	// svelte-ignore state_referenced_locally
	let durationMin = $state(existing?.type === 'feed' ? (existing.durationMin ?? 15) : 15);

	// Diaper
	// svelte-ignore state_referenced_locally
	let kind = $state<DiaperKind>(existing?.type === 'diaper' ? existing.kind : 'wet');
	// svelte-ignore state_referenced_locally
	let stoolColor = $state<string | undefined>(
		existing?.type === 'diaper' ? existing.stoolColor : undefined
	);
	// svelte-ignore state_referenced_locally
	let stoolConsistency = $state<string | undefined>(
		existing?.type === 'diaper' ? existing.stoolConsistency : undefined
	);

	// Spit-up / vomit
	// svelte-ignore state_referenced_locally
	let severity = $state<Severity | undefined>(
		existing?.type === 'spit_up' || existing?.type === 'vomit' ? existing.severity : undefined
	);

	// Solid food / MPASI
	// svelte-ignore state_referenced_locally
	let solidAmountMl = $state(existing?.type === 'solid' ? (existing.amountMl ?? 100) : 100);

	// Photo
	// svelte-ignore state_referenced_locally
	let selectedPhotoFile = $state<File | null>(null);
	// svelte-ignore state_referenced_locally
	let photoPreviewUrl = $state<string | undefined>(
		existing?.type === 'photo' ? ((existing as Doc<'activities'> & { photoUrl?: string | null }).photoUrl ?? undefined) : undefined
	);

	function handlePhotoChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0] ?? null;
		if (photoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(photoPreviewUrl);
		selectedPhotoFile = f;
		photoPreviewUrl = f ? URL.createObjectURL(f) : undefined;
	}

	let busy = $state(false);

	// Apply last-feed defaults once they arrive (creation only).
	let defaultsApplied = false;
	$effect(() => {
		if (defaultsApplied || existing || type !== 'feed') return;
		const last = lastFeed.data;
		if (last?.type !== 'feed') return;
		defaultsApplied = true;
		method = last.method;
		if (last.amountMl !== undefined) amountMl = last.amountMl;
		if (last.durationMin !== undefined) durationMin = last.durationMin;
	});

	const isBottle = $derived(method === 'bottle_breastmilk' || method === 'bottle_formula');

	const feedMethodOptions = $derived([
		{ value: 'breast_left' as const, label: m.method_breast_left() },
		{ value: 'breast_right' as const, label: m.method_breast_right() },
		{ value: 'breast_both' as const, label: m.method_breast_both() },
		{ value: 'bottle_breastmilk' as const, label: m.method_bottle_breastmilk() },
		{ value: 'bottle_formula' as const, label: m.method_bottle_formula() }
	]);
	const diaperKindOptions = $derived([
		{ value: 'wet' as const, label: m.kind_wet() },
		{ value: 'dirty' as const, label: m.kind_dirty() },
		{ value: 'mixed' as const, label: m.kind_mixed() }
	]);
	const stoolColorOptions = $derived([
		{ value: 'yellow', label: m.stool_yellow() },
		{ value: 'green', label: m.stool_green() },
		{ value: 'brown', label: m.stool_brown() },
		{ value: 'black', label: m.stool_black() },
		{ value: 'red', label: m.stool_red() }
	]);
	const consistencyOptions = $derived([
		{ value: 'liquid', label: m.consistency_liquid() },
		{ value: 'soft', label: m.consistency_soft() },
		{ value: 'seedy', label: m.consistency_seedy() },
		{ value: 'hard', label: m.consistency_hard() }
	]);
	const severityOptions = $derived([
		{ value: 'small' as const, label: m.severity_small() },
		{ value: 'medium' as const, label: m.severity_medium() },
		{ value: 'large' as const, label: m.severity_large() }
	]);

	function buildData() {
		switch (type) {
			case 'feed':
				return {
					type: 'feed' as const,
					method,
					amountMl: isBottle ? amountMl : undefined,
					durationMin: isBottle ? undefined : durationMin
				};
			case 'diaper': {
				const showStool = kind !== 'wet';
				return {
					type: 'diaper' as const,
					kind,
					stoolColor: showStool ? stoolColor : undefined,
					stoolConsistency: showStool ? stoolConsistency : undefined
				};
			}
			case 'spit_up':
				return { type: 'spit_up' as const, severity };
			case 'vomit':
				return { type: 'vomit' as const, severity };
			case 'sleep':
				return {
					type: 'sleep' as const,
					endedAt: existing?.type === 'sleep' ? existing.endedAt : undefined
				};
			case 'solid':
				return {
					type: 'solid' as const,
					amountMl: solidAmountMl || undefined
				};
			case 'photo':
				// photoStorageId is resolved in save() after upload; placeholder here
				return { type: 'photo' as const, photoStorageId: '' as Id<'_storage'> };
		}
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (type === 'photo' && !selectedPhotoFile && !existing) return;
		busy = true;
		try {
			let data = buildData();
			if (type === 'photo') {
				let photoStorageId: Id<'_storage'>;
				if (selectedPhotoFile) {
					photoStorageId = await uploadFile(client, selectedPhotoFile);
				} else {
					photoStorageId = (existing as Doc<'activities'> & { photoStorageId: Id<'_storage'> }).photoStorageId;
				}
				data = { type: 'photo' as const, photoStorageId };
			}
			const payload = {
				occurredAt,
				note: note.trim() || undefined,
				data
			};
			if (existing) {
				await client.mutation(api.activities.update, { activityId: existing._id, ...payload });
			} else {
				await client.mutation(api.activities.log, { babyId, ...payload });
			}
			toast.success(m.logged_toast());
			onsaved();
		} catch (err) {
			console.error('activity save error:', err);
			toast.error(m.error_generic());
		} finally {
			busy = false;
		}
	}
</script>

<form class="flex flex-col gap-5" onsubmit={save}>
	{#if type === 'feed'}
		<div class="flex flex-col gap-2">
			<Label>{m.feed_method_label()}</Label>
			<SegmentedControl
				options={feedMethodOptions.slice(0, 3)}
				bind:value={method}
				label={m.feed_method_label()}
			/>
			<SegmentedControl
				options={feedMethodOptions.slice(3)}
				bind:value={method}
				label={m.feed_method_label()}
			/>
		</div>
		{#if isBottle}
			<div class="flex flex-col gap-2">
				<Label>{m.amount_ml()}</Label>
				<AmountStepper bind:value={amountMl} label={m.amount_ml()} />
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				<Label>{m.duration_min()}</Label>
				<AmountStepper bind:value={durationMin} step={5} max={90} label={m.duration_min()} />
			</div>
		{/if}
	{:else if type === 'diaper'}
		<div class="flex flex-col gap-2">
			<Label>{m.diaper_kind_label()}</Label>
			<SegmentedControl
				options={diaperKindOptions}
				bind:value={kind}
				label={m.diaper_kind_label()}
			/>
		</div>
		{#if kind !== 'wet'}
			<div class="flex flex-col gap-2">
				<Label>{m.stool_color_label()}</Label>
				<SegmentedControl
					options={stoolColorOptions}
					bind:value={stoolColor}
					label={m.stool_color_label()}
					allowClear
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{m.stool_consistency_label()}</Label>
				<SegmentedControl
					options={consistencyOptions}
					bind:value={stoolConsistency}
					label={m.stool_consistency_label()}
					allowClear
				/>
			</div>
		{/if}
	{:else if type === 'spit_up' || type === 'vomit'}
		<div class="flex flex-col gap-2">
			<Label>{m.severity_label()}</Label>
			<SegmentedControl
				options={severityOptions}
				bind:value={severity}
				label={m.severity_label()}
				allowClear
			/>
		</div>
	{:else if type === 'solid'}
		<div class="flex flex-col gap-2">
			<Label>{m.amount_ml()}</Label>
			<AmountStepper bind:value={solidAmountMl} label={m.amount_ml()} />
		</div>
	{:else if type === 'photo'}
		<label class="cursor-pointer">
			{#if photoPreviewUrl}
				<img src={photoPreviewUrl} alt="preview" class="w-full max-h-72 rounded-xl object-cover" />
			{:else}
				<div class="bg-secondary flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed">
					<Camera class="text-muted-foreground size-10" />
				</div>
			{/if}
			<input
				type="file"
				accept="image/*"
				capture="environment"
				class="sr-only"
				onchange={handlePhotoChange}
				aria-label={m.activity_photo()}
			/>
		</label>
	{/if}

	<div class="flex flex-col gap-2">
		<Label>{m.time_label()}</Label>
		<TimeAgoPicker bind:value={occurredAt} />
	</div>

	<div class="flex flex-col gap-2">
		<Label for="activity-note">{m.note_label()}</Label>
		<Input id="activity-note" type="text" bind:value={note} class="min-h-12" />
	</div>

	<Button type="submit" class="min-h-14 w-full text-base" disabled={busy || (type === 'photo' && !selectedPhotoFile && !existing)}>
		{#if busy}
			<LoaderCircle class="size-5 animate-spin" />
		{/if}
		{m.save()}
	</Button>
</form>
