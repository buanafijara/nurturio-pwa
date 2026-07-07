/// <reference lib="webworker" />
/// <reference types="@vite-pwa/sveltekit/pwa" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache app shell (manifest injected by vite-plugin-pwa at build time)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Baby photos — StaleWhileRevalidate, mirrors old runtimeCaching config
registerRoute(
	({ url }) => url.pathname.startsWith('/api/storage/'),
	new StaleWhileRevalidate({
		cacheName: 'baby-photos',
		plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 })]
	})
);

// Push notification handler
self.addEventListener('push', (event) => {
	if (!event.data) return;
	let payload: { title: string; body: string; icon?: string; badge?: string; data?: { url: string } };
	try {
		payload = event.data.json();
	} catch {
		return;
	}
	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: payload.icon ?? '/icons/icon-192.png',
			badge: payload.badge ?? '/icons/icon-192.png',
			data: payload.data ?? { url: '/' }
		})
	);
});

// Notification click — focus the open app window or open a new one
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			const match = clientList.find((c) => c.url === targetUrl);
			return match ? match.focus() : self.clients.openWindow(targetUrl);
		})
	);
});
