import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { requireUser, safeUser } from './lib/access';

export const save = mutation({
	args: {
		endpoint: v.string(),
		p256dh: v.string(),
		auth: v.string()
	},
	handler: async (ctx, { endpoint, p256dh, auth }) => {
		const user = await requireUser(ctx);
		const existing = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, { p256dh, auth, userId: user._id });
			return;
		}
		await ctx.db.insert('pushSubscriptions', { userId: user._id, endpoint, p256dh, auth });
	}
});

export const remove = mutation({
	args: { endpoint: v.string() },
	handler: async (ctx, { endpoint }) => {
		await requireUser(ctx);
		const sub = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
			.unique();
		if (sub) await ctx.db.delete(sub._id);
	}
});

// Removes all push subscriptions for the current user — used when the browser
// no longer holds a matching subscription (e.g. after browser data was cleared
// or a VAPID key rotation invalidated the old subscription).
export const removeAll = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const subs = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_user', (q) => q.eq('userId', user._id))
			.collect();
		await Promise.all(subs.map((s) => ctx.db.delete(s._id)));
	}
});

export const getMyStatus = query({
	args: {},
	handler: async (ctx) => {
		const user = await safeUser(ctx);
		if (!user) return false;
		const sub = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_user', (q) => q.eq('userId', user._id))
			.first();
		return sub !== null;
	}
});

// Internal helpers used by the notifications action (must live outside "use node")

export const getOtherCaregiverSubscriptions = internalQuery({
	args: { babyId: v.id('babies'), actorUserId: v.id('users') },
	handler: async (ctx, { babyId, actorUserId }) => {
		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_baby', (q) => q.eq('babyId', babyId))
			.collect();
		const results: { locale: 'id' | 'en'; endpoint: string; p256dh: string; auth: string }[] = [];
		for (const m of memberships) {
			if (m.userId === actorUserId) continue;
			const user = await ctx.db.get(m.userId);
			if (!user) continue;
			const subs = await ctx.db
				.query('pushSubscriptions')
				.withIndex('by_user', (q) => q.eq('userId', m.userId))
				.collect();
			for (const sub of subs) {
				results.push({
					locale: user.locale ?? 'id',
					endpoint: sub.endpoint,
					p256dh: sub.p256dh,
					auth: sub.auth
				});
			}
		}
		return results;
	}
});

export const deleteByEndpoint = internalMutation({
	args: { endpoint: v.string() },
	handler: async (ctx, { endpoint }) => {
		const sub = await ctx.db
			.query('pushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
			.unique();
		if (sub) await ctx.db.delete(sub._id);
	}
});
