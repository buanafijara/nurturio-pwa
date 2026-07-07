<script lang="ts">
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { authClient } from '$lib/auth-client';
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { LoaderCircle } from '@lucide/svelte';

	let { mode }: { mode: 'sign-in' | 'sign-up' } = $props();

	const googleEnabled = env.PUBLIC_GOOGLE_AUTH === 'true';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = null;
		const result =
			mode === 'sign-up'
				? await authClient.signUp.email({ name, email, password })
				: await authClient.signIn.email({ email, password });
		busy = false;
		if (result.error) {
			if (mode === 'sign-in' && result.error.status === 401) error = m.auth_error_invalid();
			else if (mode === 'sign-up' && result.error.status === 422) error = m.auth_error_exists();
			else error = result.error.message ?? m.auth_error_generic();
			return;
		}
		goto('/');
	}

	async function google() {
		error = null;
		await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
	}
</script>

<div class="flex flex-col gap-6">
	{#if googleEnabled}
		<Button variant="outline" class="min-h-12 w-full" onclick={google}>
			{m.auth_google()}
		</Button>
		<div class="flex items-center gap-3">
			<Separator class="flex-1" />
			<span class="text-muted-foreground text-xs">{m.auth_or()}</span>
			<Separator class="flex-1" />
		</div>
	{/if}

	<form class="flex flex-col gap-4" onsubmit={submit}>
		{#if mode === 'sign-up'}
			<div class="flex flex-col gap-1.5">
				<Label for="name">{m.auth_name()}</Label>
				<Input
					id="name"
					type="text"
					autocomplete="name"
					required
					bind:value={name}
					class="min-h-12"
				/>
			</div>
		{/if}
		<div class="flex flex-col gap-1.5">
			<Label for="email">{m.auth_email()}</Label>
			<Input
				id="email"
				type="email"
				autocomplete="email"
				required
				bind:value={email}
				class="min-h-12"
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="password">{m.auth_password()}</Label>
			<Input
				id="password"
				type="password"
				autocomplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
				required
				minlength={8}
				bind:value={password}
				class="min-h-12"
			/>
		</div>

		{#if error}
			<p class="text-destructive text-sm" role="alert">{error}</p>
		{/if}

		<Button type="submit" class="min-h-12 w-full" disabled={busy}>
			{#if busy}
				<LoaderCircle class="size-4 animate-spin" />
			{/if}
			{mode === 'sign-up' ? m.auth_sign_up() : m.auth_sign_in()}
		</Button>
	</form>

	{#if mode === 'sign-in'}
		<a
			href="/sign-up"
			class="text-muted-foreground text-center text-sm underline-offset-4 hover:underline"
		>
			{m.auth_no_account()}
		</a>
	{:else}
		<a
			href="/sign-in"
			class="text-muted-foreground text-center text-sm underline-offset-4 hover:underline"
		>
			{m.auth_have_account()}
		</a>
	{/if}
</div>
