<script lang="ts">
	import { page } from '$app/state';
	import { House, History, Settings, BarChart2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	const tabs = $derived([
		{ href: '/', label: m.tab_home(), icon: House },
		{ href: '/timeline', label: m.tab_timeline(), icon: History },
		{ href: '/reports', label: m.tab_reports(), icon: BarChart2 },
		{ href: '/settings', label: m.tab_settings(), icon: Settings }
	]);

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<nav
	class="bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur supports-[backdrop-filter]:bg-card/80"
>
	<div
		class="mx-auto flex w-full max-w-md items-stretch justify-around pb-[env(safe-area-inset-bottom)]"
	>
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class={cn(
					'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
					isActive(tab.href) ? 'text-primary' : 'text-muted-foreground'
				)}
				aria-current={isActive(tab.href) ? 'page' : undefined}
			>
				<tab.icon class="size-6" />
				{tab.label}
			</a>
		{/each}
	</div>
</nav>
