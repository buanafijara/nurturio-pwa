import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
	requireMembership,
	requireOwnership,
	requireUser,
	safeMembership,
	safeUser
} from './lib/access';
import { publicUrl } from './lib/s3';

const babyFields = {
	name: v.string(),
	dateOfBirth: v.string(),
	sex: v.union(v.literal('male'), v.literal('female')),
	photoStorageId: v.optional(v.string())
};

export const create = mutation({
	args: babyFields,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const babyId = await ctx.db.insert('babies', { ...args, createdBy: user._id });
		await ctx.db.insert('memberships', { babyId, userId: user._id, role: 'owner' });
		return babyId;
	}
});

export const update = mutation({
	args: {
		babyId: v.id('babies'),
		name: v.optional(v.string()),
		dateOfBirth: v.optional(v.string()),
		sex: v.optional(v.union(v.literal('male'), v.literal('female'))),
		photoStorageId: v.optional(v.string())
	},
	handler: async (ctx, { babyId, ...patch }) => {
		await requireMembership(ctx, babyId);
		const fields = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
		await ctx.db.patch(babyId, fields);
	}
});

export const archive = mutation({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		await requireOwnership(ctx, babyId);
		await ctx.db.patch(babyId, { archivedAt: Date.now() });
	}
});

export const listMine = query({
	args: {},
	handler: async (ctx) => {
		const user = await safeUser(ctx);
		if (!user) return [];
		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_user', (q) => q.eq('userId', user._id))
			.collect();
		const babies = await Promise.all(
			memberships.map(async (membership) => {
				const baby = await ctx.db.get(membership.babyId);
				if (!baby || baby.archivedAt) return null;
				return {
					...baby,
					role: membership.role,
					photoUrl: baby.photoStorageId ? publicUrl(baby.photoStorageId) : null
				};
			})
		);
		return babies.filter((b) => b !== null);
	}
});

export const get = query({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		const access = await safeMembership(ctx, babyId);
		if (!access) return null;
		const { membership } = access;
		const baby = await ctx.db.get(babyId);
		if (!baby) return null;
		return {
			...baby,
			role: membership.role,
			photoUrl: baby.photoStorageId ? publicUrl(baby.photoStorageId) : null
		};
	}
});

export const caregivers = query({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		if (!(await safeMembership(ctx, babyId))) return [];
		const memberships = await ctx.db
			.query('memberships')
			.withIndex('by_baby', (q) => q.eq('babyId', babyId))
			.collect();
		return Promise.all(
			memberships.map(async (membership) => {
				const user = await ctx.db.get(membership.userId);
				return {
					membershipId: membership._id,
					userId: membership.userId,
					role: membership.role,
					name: user?.name ?? '?',
					imageUrl: user?.imageUrl
				};
			})
		);
	}
});
