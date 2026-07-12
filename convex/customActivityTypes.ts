import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireMembership, safeMembership } from './lib/access';

export const get = query({
	args: { typeId: v.id('customActivityTypes') },
	handler: async (ctx, { typeId }) => {
		const t = await ctx.db.get(typeId);
		if (!t || t.archivedAt !== undefined) return null;
		if (!(await safeMembership(ctx, t.babyId))) return null;
		return t;
	}
});

export const list = query({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		if (!(await safeMembership(ctx, babyId))) return [];
		const all = await ctx.db
			.query('customActivityTypes')
			.withIndex('by_baby', (q) => q.eq('babyId', babyId))
			.collect();
		return all.filter((t) => t.archivedAt === undefined);
	}
});

export const create = mutation({
	args: {
		babyId: v.id('babies'),
		name: v.string(),
		emoji: v.string()
	},
	handler: async (ctx, { babyId, name, emoji }) => {
		const { user } = await requireMembership(ctx, babyId);
		const trimmed = name.trim();
		if (!trimmed) throw new ConvexError('name_required');
		return ctx.db.insert('customActivityTypes', {
			babyId,
			name: trimmed,
			emoji: emoji || '•',
			createdBy: user._id
		});
	}
});

export const archive = mutation({
	args: { typeId: v.id('customActivityTypes') },
	handler: async (ctx, { typeId }) => {
		const existing = await ctx.db.get(typeId);
		if (!existing) throw new ConvexError('not_found');
		await requireMembership(ctx, existing.babyId);
		await ctx.db.patch(typeId, { archivedAt: Date.now() });
	}
});
