import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth/minimal';
import { components } from './_generated/api';
import { type DataModel } from './_generated/dataModel';
import authConfig from './auth.config';

const siteUrl = process.env.SITE_URL!;

// In local dev the Convex deployment serves HTTPS but the browser accesses
// the app over HTTP (localhost). HTTP origins cannot store __Secure- cookies,
// so login appears to succeed but the session is never established. Setting
// USE_SECURE_COOKIES=false on the dev deployment disables the __Secure- prefix
// and the Secure flag so cookies work on http://localhost and local device IPs.
const useSecureCookies = process.env.USE_SECURE_COOKIES !== 'false';

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
	betterAuth({
		baseURL: siteUrl,
		advanced: { useSecureCookies },
		trustedOrigins: process.env.TRUSTED_ORIGINS
			? process.env.TRUSTED_ORIGINS.split(',').map((o) => o.trim())
			: [],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false
		},
		// Google sign-in activates once GOOGLE_CLIENT_ID/SECRET are set on the
		// Convex deployment (npx convex env set ...).
		socialProviders:
			process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
				? {
						google: {
							clientId: process.env.GOOGLE_CLIENT_ID,
							clientSecret: process.env.GOOGLE_CLIENT_SECRET
						}
					}
				: undefined,
		plugins: [convex({ authConfig })]
	});
