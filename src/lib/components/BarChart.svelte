<script lang="ts">
	interface Props {
		data: number[];
		labels: string[];
		height?: number;
		formatter?: (v: number) => string;
		target?: number;
	}

	let { data, labels, height = 100, formatter = (v) => String(v), target }: Props = $props();

	// Scale so the target line always fits within the chart.
	const maxVal = $derived(Math.max(...data, target ?? 0, 1));

	// Show at most 7 labels to avoid crowding on 30-day view.
	const labelStep = $derived(Math.ceil(data.length / 7));
</script>

<div class="flex flex-col gap-1">
	<div class="relative flex items-end gap-[2px]" style="height: {height}px">
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
		{#if target}
			{@const lineTop = height - Math.round((target / maxVal) * height)}
			<div
				class="pointer-events-none absolute left-0 right-0 flex items-center"
				style="top: {lineTop}px"
			>
				<div class="h-[1.5px] flex-1 border-t-2 border-dashed border-amber-400 opacity-80"></div>
				<span class="text-amber-500 ml-1 shrink-0 text-[8px] leading-none font-medium"
					>{formatter(target)}</span
				>
			</div>
		{/if}
	</div>
	<div class="flex gap-[2px]">
		{#each labels as label, i (i)}
			<div class="text-muted-foreground flex-1 truncate text-center text-[9px] leading-tight">
				{i % labelStep === 0 ? label : ''}
			</div>
		{/each}
	</div>
</div>
