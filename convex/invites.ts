import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireOwnership, requireUser, safeMembership } from './lib/access';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Unambiguous alphabet (no 0/O, 1/I/L) — codes get read aloud between parents.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const create = mutation({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		const { user } = await requireOwnership(ctx, babyId);
		const code = generateCode();
		await ctx.db.insert('invites', {
			babyId,
			code,
			createdBy: user._id,
			expiresAt: Date.now() + INVITE_TTL_MS
		});
		return code;
	}
});

export const redeem = mutation({
	args: { code: v.string() },
	handler: async (ctx, { code }) => {
		const user = await requireUser(ctx);
		const invite = await ctx.db
			.query('invites')
			.withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase()))
			.unique();
		if (!invite || invite.revokedAt || invite.expiresAt < Date.now() || invite.usedBy) {
			throw new ConvexError('invite_invalid');
		}
		const existing = await ctx.db
			.query('memberships')
			.withIndex('by_baby_user', (q) => q.eq('babyId', invite.babyId).eq('userId', user._id))
			.unique();
		if (existing) return invite.babyId; // already a caregiver — treat as success
		await ctx.db.insert('memberships', {
			babyId: invite.babyId,
			userId: user._id,
			role: 'caregiver'
		});
		await ctx.db.patch(invite._id, { usedBy: user._id });
		return invite.babyId;
	}
});

export const revoke = mutation({
	args: { inviteId: v.id('invites') },
	handler: async (ctx, { inviteId }) => {
		const invite = await ctx.db.get(inviteId);
		if (!invite) return;
		await requireOwnership(ctx, invite.babyId);
		await ctx.db.patch(inviteId, { revokedAt: Date.now() });
	}
});

// Pending (shareable) invites only.
export const listForBaby = query({
	args: { babyId: v.id('babies') },
	handler: async (ctx, { babyId }) => {
		if (!(await safeMembership(ctx, babyId))) return [];
		const invites = await ctx.db
			.query('invites')
			.withIndex('by_baby', (q) => q.eq('babyId', babyId))
			.collect();
		const now = Date.now();
		return invites
			.filter((i) => !i.usedBy && !i.revokedAt && i.expiresAt > now)
			.map(({ _id, code, expiresAt }) => ({ _id, code, expiresAt }));
	}
});
