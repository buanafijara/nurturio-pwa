import { ConvexError } from 'convex/values';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authComponent } from '../auth';

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(ctx: Ctx): Promise<Doc<'users'>> {
	const authUser = await authComponent.getAuthUser(ctx);
	const profile = await ctx.db
		.query('users')
		.withIndex('by_authId', (q) => q.eq('authId', authUser._id))
		.unique();
	if (!profile) throw new ConvexError('profile_missing');
	return profile;
}

// Query-friendly variants: subscriptions fire before the auth token is
// attached, so queries return empty results instead of throwing.
export async function safeUser(ctx: Ctx): Promise<Doc<'users'> | null> {
	const authUser = await authComponent.safeGetAuthUser(ctx);
	if (!authUser) return null;
	return ctx.db
		.query('users')
		.withIndex('by_authId', (q) => q.eq('authId', authUser._id))
		.unique();
}

export async function safeMembership(
	ctx: Ctx,
	babyId: Id<'babies'>
): Promise<{ user: Doc<'users'>; membership: Doc<'memberships'> } | null> {
	const user = await safeUser(ctx);
	if (!user) return null;
	const membership = await ctx.db
		.query('memberships')
		.withIndex('by_baby_user', (q) => q.eq('babyId', babyId).eq('userId', user._id))
		.unique();
	if (!membership) return null;
	return { user, membership };
}

export async function requireMembership(
	ctx: Ctx,
	babyId: Id<'babies'>
): Promise<{ user: Doc<'users'>; membership: Doc<'memberships'> }> {
	const user = await requireUser(ctx);
	const membership = await ctx.db
		.query('memberships')
		.withIndex('by_baby_user', (q) => q.eq('babyId', babyId).eq('userId', user._id))
		.unique();
	if (!membership) throw new ConvexError('not_a_caregiver');
	return { user, membership };
}

export async function requireOwnership(ctx: Ctx, babyId: Id<'babies'>) {
	const result = await requireMembership(ctx, babyId);
	if (result.membership.role !== 'owner') throw new ConvexError('not_an_owner');
	return result;
}
