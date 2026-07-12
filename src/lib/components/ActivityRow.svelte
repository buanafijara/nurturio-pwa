<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { Doc } from '$lib/convex';
	import { api } from '$lib/convex';
	import { activityIcons, activityLabel, isBuiltinType } from '$lib/activity-types';
	import { formatDuration } from '$lib/utils/time';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';

	let { activity }: { activity: Doc<'activities'> } = $props();

	const Icon = $derived(isBuiltinType(activity.type) ? activityIcons[activity.type] : null);

	const photoUrl = useQuery(
		api.activities.getPhotoUrl,
		() => activity.type === 'photo' ? { storageId: activity.photoStorageId } : 'skip'
	);

	function methodLabel(method: string): string {
		switch (method) {
			case 'breast_left':
				return m.method_breast_left();
			case 'breast_right':
				return m.method_breast_right();
			case 'breast_both':
				return m.method_breast_both();
			case 'bottle_breastmilk':
				return m.method_bottle_breastmilk();
			default:
				return m.method_bottle_formula();
		}
	}

	function kindLabel(kind: string): string {
		switch (kind) {
			case 'wet':
				return m.kind_wet();
			case 'dirty':
				return m.kind_dirty();
			default:
				return m.kind_mixed();
		}
	}

	function severityLabel(severity: string): string {
		switch (severity) {
			case 'small':
				return m.severity_small();
			case 'medium':
				return m.severity_medium();
			default:
				return m.severity_large();
		}
	}

	const customLabel = $derived(activity.type === 'custom' ? `${activity.emoji} ${activity.name}` : null);

	const description = $derived.by(() => {
		const parts: string[] = [];
		switch (activity.type) {
			case 'feed':
				parts.push(methodLabel(activity.method));
				if (activity.amountMl !== undefined) parts.push(`${activity.amountMl} ml`);
				if (activity.durationMin !== undefined)
					parts.push(m.duration_m({ min: activity.durationMin }));
				break;
			case 'diaper':
				parts.push(kindLabel(activity.kind));
				break;
			case 'spit_up':
			case 'vomit':
				if (activity.severity) parts.push(severityLabel(activity.severity));
				break;
			case 'sleep':
				parts.push(
					activity.endedAt === undefined
						? m.sleep_ongoing()
						: formatDuration(Math.round((activity.endedAt - activity.occurredAt) / 60_000))
				);
				break;
			case 'solid':
				if (activity.amountMl !== undefined) parts.push(`${activity.amountMl} ml`);
				break;
			case 'photo':
			break;
		case 'custom':
			break;
		}
		if (activity.note) parts.push(activity.note);
		return parts.join(' · ');
	});

	const time = $derived(
		new Date(activity.occurredAt).toLocaleTimeString(getLocale(), {
			hour: '2-digit',
			minute: '2-digit'
		})
	);
</script>

<a
	href={activity.type === 'custom'
		? `/log/custom?typeId=${activity.customTypeId}&edit=${activity._id}`
		: `/log/${activity.type}?edit=${activity._id}`}
	class="bg-card flex flex-col rounded-xl border overflow-hidden"
>
	<div class="flex min-h-16 items-center gap-3 px-3 py-2">
		<span class="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-full">
			{#if Icon}
				<Icon class="text-primary size-5" />
			{:else}
				<span class="text-lg leading-none">{activity.type === 'custom' ? activity.emoji : '•'}</span>
			{/if}
		</span>
		<span class="min-w-0 flex-1">
			<span class="block font-medium">{customLabel ?? activityLabel(activity.type)}</span>
			{#if description}
				<span class="text-muted-foreground block truncate text-sm">{description}</span>
			{/if}
		</span>
		<span class="text-muted-foreground shrink-0 text-sm tabular-nums">{time}</span>
	</div>
	{#if activity.type === 'photo' && photoUrl.data}
		<img src={photoUrl.data} alt={activity.note ?? m.activity_photo()} class="w-full max-h-72 object-cover" />
	{/if}
</a>
