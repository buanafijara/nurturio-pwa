<script lang="ts">
	import { goto } from '$app/navigation';
	import { useQuery } from 'convex-svelte';
	import { api } from '$lib/convex';
	import { authClient } from '$lib/auth-client';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, setLocale, locales, type Locale } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Baby, ChevronRight, LogOut, Plus, Sparkles, Users } from '@lucide/svelte';
	import NotificationToggle from '$lib/components/NotificationToggle.svelte';

	const me = useQuery(api.users.me, {});

	const languageLabels: Record<Locale, string> = {
		en: m.settings_language_en(),
		id: m.settings_language_id()
	};

	async function signOut() {
		await authClient.signOut();
		goto('/sign-in');
	}
</script>

<div class="flex flex-col gap-6">
	<h1 class="pt-2 text-2xl font-bold">{m.settings_title()}</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.settings_account()}</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if me.data}
				{@const name = me.data.profile?.name ?? me.data.authName}
				<div class="flex items-center gap-3">
					<Avatar.Root>
						<Avatar.Image src={me.data.profile?.imageUrl} alt={name} />
						<Avatar.Fallback>{name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
					</Avatar.Root>
					<div class="min-w-0">
						<p class="truncate font-medium">{name}</p>
						<p class="text-muted-foreground truncate text-sm">{me.data.email}</p>
					</div>
				</div>
			{/if}
			<Button variant="outline" class="min-h-12" onclick={signOut}>
				<LogOut class="size-4" />
				{m.auth_sign_out()}
			</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content class="flex flex-col">
			<a href="/baby/settings" class="flex min-h-12 items-center gap-3">
				<Baby class="text-primary size-5" />
				<span class="flex-1 font-medium">{m.settings_baby()}</span>
				<ChevronRight class="text-muted-foreground size-4" />
			</a>
			<Separator />
			<a href="/baby/caregivers" class="flex min-h-12 items-center gap-3">
				<Users class="text-primary size-5" />
				<span class="flex-1 font-medium">{m.settings_caregivers()}</span>
				<ChevronRight class="text-muted-foreground size-4" />
			</a>
			<Separator />
			<a href="/baby/new" class="flex min-h-12 items-center gap-3">
				<Plus class="text-primary size-5" />
				<span class="flex-1 font-medium">{m.add_baby()}</span>
				<ChevronRight class="text-muted-foreground size-4" />
			</a>
			<Separator />
			<a href="/settings/custom-activities" class="flex min-h-12 items-center gap-3">
				<Sparkles class="text-primary size-5" />
				<span class="flex-1 font-medium">Custom Activities</span>
				<ChevronRight class="text-muted-foreground size-4" />
			</a>
			<Separator />
			<NotificationToggle />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.settings_language()}</Card.Title>
		</Card.Header>
		<Card.Content class="flex gap-2">
			{#each locales as locale (locale)}
				<Button
					variant={getLocale() === locale ? 'default' : 'outline'}
					class="min-h-12 flex-1"
					onclick={() => setLocale(locale)}
				>
					{languageLabels[locale]}
				</Button>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
