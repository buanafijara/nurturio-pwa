<script lang="ts">
	import { Minus, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let {
		value = $bindable(),
		step = 10,
		min = 0,
		max = 500,
		label
	}: {
		value: number;
		step?: number;
		min?: number;
		max?: number;
		label: string;
	} = $props();

	function clamp(n: number): number {
		return Math.min(max, Math.max(min, n));
	}
</script>

<div class="flex items-center gap-3" aria-label={label}>
	<Button
		type="button"
		variant="outline"
		class="size-14 shrink-0 rounded-full text-xl"
		onclick={() => (value = clamp(value - step))}
		aria-label="−{step}"
	>
		<Minus class="size-6" />
	</Button>
	<Input
		type="number"
		inputmode="numeric"
		{min}
		{max}
		bind:value
		class="min-h-14 text-center !text-2xl font-semibold"
	/>
	<Button
		type="button"
		variant="outline"
		class="size-14 shrink-0 rounded-full text-xl"
		onclick={() => (value = clamp(value + step))}
		aria-label="+{step}"
	>
		<Plus class="size-6" />
	</Button>
</div>
