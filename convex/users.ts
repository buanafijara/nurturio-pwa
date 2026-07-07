import { mutation, query } from './_generated/server';
import { authComponent } from './auth';

// Returns null while unauthenticated; profile is null until ensureProfile
// runs — the client uses that distinction to know when to create it.
export const me = query({
	args: {},
	handler: async (ctx) => {
		const authUser = await authComponent.safeGetAuthUser(ctx);
		if (!authUser) return null;
		const profile = await ctx.db
			.query('users')
			.withIndex('by_authId', (q) => q.eq('authId', authUser._id))
			.unique();
		return { email: authUser.email, authName: authUser.name, profile };
	}
});

// Idempotent upsert, called by the client once after sign-in.
export const ensureProfile = mutation({
	args: {},
	handler: async (ctx) => {
		const authUser = await authComponent.getAuthUser(ctx);
		const existing = await ctx.db
			.query('users')
			.withIndex('by_authId', (q) => q.eq('authId', authUser._id))
			.unique();
		if (existing) return existing._id;
		return ctx.db.insert('users', {
			authId: authUser._id,
			name: authUser.name || authUser.email,
			imageUrl: authUser.image ?? undefined
		});
	}
});
