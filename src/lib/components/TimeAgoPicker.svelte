<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import { Input } from '$lib/components/ui/input';

	let { value = $bindable() }: { value: number } = $props();

	type Choice = 'now' | '15m' | '30m' | '1h' | 'custom';

	// Editing an older entry starts in custom mode so the original time shows.
	let choice = $state<Choice>(Math.abs(Date.now() - value) < 60_000 ? 'now' : 'custom');

	const chips: { key: Choice; label: () => string; offsetMin?: number }[] = [
		{ key: 'now', label: () => m.time_now(), offsetMin: 0 },
		{ key: '15m', label: () => m.time_15m(), offsetMin: 15 },
		{ key: '30m', label: () => m.time_30m(), offsetMin: 30 },
		{ key: '1h', label: () => m.time_1h(), offsetMin: 60 },
		{ key: 'custom', label: () => m.time_custom() }
	];

	function pick(chip: (typeof chips)[number]) {
		choice = chip.key;
		if (chip.offsetMin !== undefined) value = Date.now() - chip.offsetMin * 60_000;
	}

	// datetime-local wants "YYYY-MM-DDTHH:mm" in local time
	function toLocalInput(ms: number): string {
		const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
		return d.toISOString().slice(0, 16);
	}

	function fromLocalInput(text: string) {
		const parsed = new Date(text).getTime();
		if (!Number.isNaN(parsed)) value = parsed;
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap gap-2">
		{#each chips as chip (chip.key)}
			<button
				type="button"
				class={cn(
					'min-h-10 rounded-full border px-4 text-sm font-medium transition-colors',
					choice === chip.key
						? 'border-primary bg-primary text-primary-foreground'
						: 'bg-card text-muted-foreground'
				)}
				onclick={() => pick(chip)}
			>
				{chip.label()}
			</button>
		{/each}
	</div>
	{#if choice === 'custom'}
		<Input
			type="datetime-local"
			class="min-h-12"
			max={toLocalInput(Date.now())}
			value={toLocalInput(value)}
			onchange={(e) => fromLocalInput(e.currentTarget.value)}
		/>
	{/if}
</div>
