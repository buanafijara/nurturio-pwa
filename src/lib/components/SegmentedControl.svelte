<script lang="ts" generics="T extends string">
	import { cn } from '$lib/utils';

	let {
		options,
		value = $bindable(),
		columns = options.length,
		label,
		allowClear = false
	}: {
		options: readonly { value: T; label: string }[];
		value: T | undefined;
		columns?: number;
		label: string;
		allowClear?: boolean; // tap the active option again to unset (optional fields)
	} = $props();
</script>

<div
	class="grid gap-2"
	style="grid-template-columns: repeat({columns}, minmax(0, 1fr))"
	role="radiogroup"
	aria-label={label}
>
	{#each options as option (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class={cn(
				'min-h-12 rounded-lg border px-2 text-sm font-medium transition-colors',
				value === option.value
					? 'border-primary bg-primary text-primary-foreground'
					: 'bg-card text-muted-foreground'
			)}
			onclick={() => (value = allowClear && value === option.value ? undefined : option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
