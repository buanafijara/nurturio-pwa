<script lang="ts">
	interface Props {
		data: number[];
		labels: string[];
		height?: number;
		formatter?: (v: number) => string;
	}

	let { data, labels, height = 100, formatter = (v) => String(v) }: Props = $props();

	const maxVal = $derived(Math.max(...data, 1));

	// Show at most 7 labels to avoid crowding on 30-day view.
	const labelStep = $derived(Math.ceil(data.length / 7));
</script>

<div class="flex flex-col gap-1">
	<div class="flex items-end gap-[2px]" style="height: {height}px">
		{#each data as value, i (i)}
			{@const barH = Math.round((value / maxVal) * height)}
			<div class="relative flex flex-1 flex-col items-center justify-end">
				{#if value > 0}
					<span class="text-muted-foreground mb-0.5 text-[9px] leading-none"
						>{formatter(value)}</span
					>
				{/if}
				<div
					class="bg-primary/80 w-full rounded-t-sm transition-all duration-300"
					style="height: {Math.max(barH, value > 0 ? 3 : 0)}px"
				></div>
			</div>
		{/each}
	</div>
	<div class="flex gap-[2px]">
		{#each labels as label, i (i)}
			<div class="text-muted-foreground flex-1 truncate text-center text-[9px] leading-tight">
				{i % labelStep === 0 ? label : ''}
			</div>
		{/each}
	</div>
</div>
