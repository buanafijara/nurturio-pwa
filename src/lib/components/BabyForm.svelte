<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import { LoaderCircle, Camera } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type Sex = 'male' | 'female';

	let {
		initial,
		submitLabel,
		busy = false,
		onsubmit
	}: {
		initial?: { name: string; dateOfBirth: string; sex: Sex; photoUrl?: string | null };
		submitLabel: string;
		busy?: boolean;
		onsubmit: (data: { name: string; dateOfBirth: string; sex: Sex; file: File | null }) => void;
	} = $props();

	// Deliberately seeded from the initial snapshot — callers re-key the
	// component when the baby changes.
	// svelte-ignore state_referenced_locally
	let name = $state(initial?.name ?? '');
	// svelte-ignore state_referenced_locally
	let dateOfBirth = $state(initial?.dateOfBirth ?? '');
	// svelte-ignore state_referenced_locally
	let sex = $state<Sex>(initial?.sex ?? 'female');
	// svelte-ignore state_referenced_locally
	let selectedFile = $state<File | null>(null);
	// svelte-ignore state_referenced_locally
	let previewUrl = $state<string | undefined>(initial?.photoUrl ?? undefined);
	const today = new Date().toISOString().slice(0, 10);

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0] ?? null;
		if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
		selectedFile = f;
		previewUrl = f ? URL.createObjectURL(f) : (initial?.photoUrl ?? undefined);
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		onsubmit({ name: name.trim(), dateOfBirth, sex, file: selectedFile });
	}
</script>

<form class="flex flex-col gap-4" onsubmit={submit}>
	<div class="flex justify-center">
		<label class="relative cursor-pointer">
			<Avatar.Root class="size-24">
				{#if previewUrl}
					<img src={previewUrl} alt={name} class="size-full rounded-full object-cover" />
				{:else}
					<Avatar.Fallback><Camera class="text-muted-foreground size-8" /></Avatar.Fallback>
				{/if}
			</Avatar.Root>
			<input type="file" accept="image/*" class="sr-only" onchange={handleFileChange} aria-label={m.baby_photo()} />
			<span
				class="bg-primary text-primary-foreground absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full"
			>
				<Camera class="size-4" />
			</span>
		</label>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="baby-name">{m.baby_name()}</Label>
		<Input id="baby-name" type="text" required bind:value={name} class="min-h-12" />
	</div>

	<div class="flex flex-col gap-1.5">
		<Label for="baby-dob">{m.baby_dob()}</Label>
		<Input
			id="baby-dob"
			type="date"
			required
			max={today}
			bind:value={dateOfBirth}
			class="min-h-12"
		/>
	</div>

	<div class="flex flex-col gap-1.5">
		<Label>{m.baby_sex()}</Label>
		<div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label={m.baby_sex()}>
			{#each [{ value: 'female', label: m.sex_female() }, { value: 'male', label: m.sex_male() }] as const as option (option.value)}
				<button
					type="button"
					role="radio"
					aria-checked={sex === option.value}
					class={cn(
						'min-h-12 rounded-lg border font-medium transition-colors',
						sex === option.value
							? 'border-primary bg-primary text-primary-foreground'
							: 'bg-card text-muted-foreground'
					)}
					onclick={() => (sex = option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	<Button type="submit" class="min-h-12 w-full" disabled={busy || !name.trim() || !dateOfBirth}>
		{#if busy}
			<LoaderCircle class="size-4 animate-spin" />
		{/if}
		{submitLabel}
	</Button>
</form>
