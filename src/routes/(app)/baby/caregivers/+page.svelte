<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { toast } from 'svelte-sonner';
	import { api, type Id } from '$lib/convex';
	import { selectedBaby } from '$lib/stores/selected-baby.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Copy, MessageCircle, Plus, X } from '@lucide/svelte';

	const client = useConvexClient();
	const baby = useQuery(api.babies.get, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);
	const caregivers = useQuery(api.babies.caregivers, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);
	const invites = useQuery(api.invites.listForBaby, () =>
		selectedBaby.id ? { babyId: selectedBaby.id } : 'skip'
	);

	let creating = $state(false);

	function inviteLink(code: string): string {
		return `${location.origin}/join/${code}`;
	}

	async function createInvite() {
		if (!selectedBaby.id) return;
		creating = true;
		try {
			await client.mutation(api.invites.create, { babyId: selectedBaby.id });
		} catch {
			toast.error(m.error_generic());
		} finally {
			creating = false;
		}
	}

	async function copyLink(code: string) {
		await navigator.clipboard.writeText(inviteLink(code));
		toast.success(m.invite_copied());
	}

	function whatsappHref(code: string): string {
		const text = m.invite_share_text({
			name: baby.data?.name ?? '',
			link: inviteLink(code)
		});
		return `https://wa.me/?text=${encodeURIComponent(text)}`;
	}

	async function revoke(inviteId: Id<'invites'>) {
		try {
			await client.mutation(api.invites.revoke, { inviteId });
		} catch {
			toast.error(m.error_generic());
		}
	}
</script>

<div class="flex flex-col gap-6">
	<h1 class="pt-2 text-2xl font-bold">{m.caregivers_title()}</h1>

	<Card.Root>
		<Card.Content class="flex flex-col gap-4">
			{#each caregivers.data ?? [] as caregiver (caregiver.membershipId)}
				<div class="flex items-center gap-3">
					<Avatar.Root>
						<Avatar.Image src={caregiver.imageUrl} alt={caregiver.name} />
						<Avatar.Fallback>{caregiver.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
					</Avatar.Root>
					<p class="min-w-0 flex-1 truncate font-medium">{caregiver.name}</p>
					<Badge variant={caregiver.role === 'owner' ? 'default' : 'secondary'}>
						{caregiver.role === 'owner' ? m.role_owner() : m.role_caregiver()}
					</Badge>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	{#if baby.data?.role === 'owner'}
		<Button class="min-h-12" onclick={createInvite} disabled={creating}>
			<Plus class="size-4" />
			{m.invite_create()}
		</Button>

		{#if invites.data?.length}
			<section class="flex flex-col gap-3">
				<h2 class="text-lg font-semibold">{m.invite_pending()}</h2>
				{#each invites.data as invite (invite._id)}
					<Card.Root>
						<Card.Content class="flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="font-mono text-xl tracking-widest">{invite.code}</span>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => revoke(invite._id)}
									aria-label={m.invite_revoke()}
								>
									<X class="size-4" />
								</Button>
							</div>
							<p class="text-muted-foreground text-xs">
								{m.invite_expires({
									date: new Date(invite.expiresAt).toLocaleDateString(getLocale())
								})}
							</p>
							<div class="grid grid-cols-2 gap-2">
								<Button
									variant="outline"
									class="min-h-11"
									href={whatsappHref(invite.code)}
									target="_blank"
								>
									<MessageCircle class="size-4" />
									{m.invite_share_whatsapp()}
								</Button>
								<Button variant="outline" class="min-h-11" onclick={() => copyLink(invite.code)}>
									<Copy class="size-4" />
									{m.invite_copy()}
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</section>
		{/if}
	{/if}
</div>
