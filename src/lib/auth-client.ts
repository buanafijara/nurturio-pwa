import { createAuthClient } from 'better-auth/svelte';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

// Talks to same-origin /api/auth/*, which proxies to the Convex deployment.
export const authClient = createAuthClient({
	plugins: [convexClient()]
});
