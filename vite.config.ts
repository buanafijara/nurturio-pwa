import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, type Plugin } from 'vite';

// On Vercel + Vite 8 (rolldown bundler) the real build error from SvelteKit's
// writeBundle is silently replaced by vite-pwa's closeBundle ENOENT for
// service-worker.js (which was never written because the upstream build failed).
//
// Rolldown passes `err` to closeBundle only for errors that occur during
// bundle.close() itself, NOT for errors from bundle.write().  So the common
// pattern `if (err) return` never fires.  The reliable signal is whether
// service-worker.js actually exists on disk: if it's absent when closeBundle
// runs, the upstream writeBundle failed and we must stay silent so the real
// error can propagate out of Vite's `finally { bundle.close() }` block.
//
// The server-manifest waiter is a safety-net for a separate rolldown race:
// if writeBundle fires before output files are fully flushed to disk,
// SvelteKit reads a missing manifest.json as its first step.  In practice
// the file is always present, so the poll is a zero-cost fast-path.

// Shared state written by configResolved, read by the pwa wrapper at
// closeBundle time (both run in the same Vite process).
const _rolldownFix = { root: '', isSsr: false };

function rolldownServerManifestPlugin(): Plugin {
	return {
		name: 'sveltekit-rolldown-server-manifest',
		enforce: 'pre',
		configResolved(config) {
			_rolldownFix.root = config.root;
			_rolldownFix.isSsr = !!config.build.ssr;
		},
		writeBundle: {
			order: 'pre',
			sequential: true,
			async handler() {
				if (!_rolldownFix.isSsr) return;
				const manifestPath = resolve(
					_rolldownFix.root,
					'.svelte-kit/output/server/.vite/manifest.json'
				);
				if (existsSync(manifestPath)) return;
				console.log('\n[rolldown-fix] waiting for server/.vite/manifest.json…');
				const deadline = Date.now() + 30_000;
				while (!existsSync(manifestPath)) {
					if (Date.now() > deadline) {
						console.warn('[rolldown-fix] timed out waiting for server manifest');
						break;
					}
					await new Promise<void>((r) => setTimeout(r, 100));
				}
			}
		}
	};
}

// Wrap every vite-pwa closeBundle so that when the upstream build failed
// (service-worker.js was never written) we return silently instead of
// throwing ENOENT and hiding the real error.
function rolldownPwaWrapper(plugins: Plugin[]): Plugin[] {
	return plugins.map((plugin) => {
		if (!plugin.closeBundle) return plugin;
		const orig = plugin.closeBundle;
		return {
			...plugin,
			closeBundle: {
				...(typeof orig === 'object' ? orig : {}),
				async handler(err?: Error) {
					// _rolldownFix.root is always the project root (all Vite builds in this
					// process share the same root). _rolldownFix.isSsr is NOT used here:
					// inner client/SW builds triggered from SvelteKit's writeBundle reset it
					// to false before the outer SSR closeBundle fires, making it unreliable.
					// File existence is the correct and stable signal.
					if (_rolldownFix.root) {
						const swPath = resolve(
							_rolldownFix.root,
							'.svelte-kit/output/client/service-worker.js'
						);
						if (!existsSync(swPath)) {
							// SW absent → upstream writeBundle failed; stay silent so the
							// real error surfaces instead of this ENOENT.
							console.warn(
								'\n[rolldown-fix] service-worker.js absent — skipping pwa closeBundle to surface real error'
							);
							return;
						}
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const fn: (...a: any[]) => any =
						typeof orig === 'function' ? orig : (orig as any).handler;
					return fn(err);
				}
			} as Plugin['closeBundle']
		};
	});
}

export default defineConfig({
	server: {
		host: true,
		// In dev, proxy Convex backend so phones on the local network can reach
		// it. The Convex local process only binds to 127.0.0.1; this forwards
		// requests (including WebSocket upgrades) through Vite, which does
		// listen on 0.0.0.0. The client URL is constructed dynamically in dev
		// (see src/routes/+layout.svelte).
		proxy: {
			'/convex-proxy': {
				target: 'http://127.0.0.1:3210',
				changeOrigin: true,
				ws: true,
				rewrite: (path) => path.replace(/^\/convex-proxy/, '')
			}
		}
	},
	ssr: {
		// Imports SvelteKit virtual modules ($env) — must be bundled by Vite,
		// not loaded as an external package by Node.
		noExternal: ['@mmailaender/convex-better-auth-svelte']
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Installed app, not a content site: locale from cookie/localStorage, no URL prefix.
			strategy: ['cookie', 'localStorage', 'preferredLanguage', 'baseLocale']
		}),
		rolldownServerManifestPlugin(),
		...rolldownPwaWrapper(SvelteKitPWA({
			registerType: 'prompt', // never auto-reload mid-log at 3 AM
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			injectManifest: { injectionPoint: 'self.__WB_MANIFEST' },
			manifest: {
				name: 'Nurtur.io',
				short_name: 'Nurtur.io',
				description: 'Companion for tracking your baby’s feeds, diapers, and sleep',
				lang: 'id',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				background_color: '#FDFBF5',
				theme_color: '#2E9E8B',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icons/icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		}))
	]
});
