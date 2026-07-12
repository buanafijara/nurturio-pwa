import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireOwnership, safeMembership } from './lib/access';

export const list = query({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		if (!(await safeMembership(ctx, babyId))) return [];
		return ctx.db
			.query('activityTargets')
			.withIndex('by_baby', (q) => q.eq('babyId', babyId))
			.collect();
	}
});

export const set = mutation({
	args: {
		babyId: v.id('babies'),
		activityType: v.string(),
		customTypeId: v.optional(v.id('customActivityTypes')),
		customTypeName: v.optional(v.string()),
		period: v.union(v.literal('daily'), v.literal('weekly')),
		metric: v.union(v.literal('count'), v.literal('ml'), v.literal('min')),
		targetValue: v.number()
	},
	handler: async (ctx, { babyId, activityType, customTypeId, customTypeName, period, metric, targetValue }) => {
		await requireOwnership(ctx, babyId);
		if (targetValue <= 0) throw new ConvexError('target_value_must_be_positive');

		// Upsert: find existing target for the same (baby, type, customType, period)
		const all = await ctx.db
			.query('activityTargets')
			.withIndex('by_baby', (q) => q.eq('babyId', babyId))
			.collect();

		const existing = all.find(
			(t) =>
				t.activityType === activityType &&
				t.customTypeId === customTypeId &&
				t.period === period
		);

		if (existing) {
			await ctx.db.patch(existing._id, { metric, targetValue, customTypeName });
		} else {
			await ctx.db.insert('activityTargets', {
				babyId,
				activityType,
				customTypeId,
				customTypeName,
				period,
				metric,
				targetValue
			});
		}
	}
});

export const remove = mutation({
	args: { targetId: v.id('activityTargets') },
	handler: async (ctx, { targetId }) => {
		const existing = await ctx.db.get(targetId);
		if (!existing) throw new ConvexError('not_found');
		await requireOwnership(ctx, existing.babyId);
		await ctx.db.delete(targetId);
	}
});
