import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { diaperKind, feedMethod, severity } from './schema';
import { requireMembership, safeMembership, safeUser } from './lib/access';
import { publicUrl } from './lib/s3';

// Type-specific payload, shared by log and update.
const activityData = v.union(
	v.object({
		type: v.literal('feed'),
		method: feedMethod,
		amountMl: v.optional(v.number()),
		durationMin: v.optional(v.number())
	}),
	v.object({
		type: v.literal('diaper'),
		kind: diaperKind,
		stoolColor: v.optional(v.string()),
		stoolConsistency: v.optional(v.string())
	}),
	v.object({ type: v.literal('spit_up'), severity: v.optional(severity) }),
	v.object({ type: v.literal('vomit'), severity: v.optional(severity) }),
	v.object({ type: v.literal('sleep'), endedAt: v.optional(v.number()) }),
	v.object({ type: v.literal('solid'), amountMl: v.optional(v.number()) }),
	v.object({ type: v.literal('photo'), photoStorageId: v.string() })
);

export const activityType = v.union(
	v.literal('feed'),
	v.literal('diaper'),
	v.literal('spit_up'),
	v.literal('vomit'),
	v.literal('sleep'),
	v.literal('solid'),
	v.literal('photo')
);

export const log = mutation({
	args: {
		babyId: v.id('babies'),
		occurredAt: v.number(),
		note: v.optional(v.string()),
		data: activityData
	},
	handler: async (ctx, { babyId, occurredAt, note, data }) => {
		const { user } = await requireMembership(ctx, babyId);
		const activityId = await ctx.db.insert('activities', {
			babyId,
			occurredAt,
			note,
			createdBy: user._id,
			...data
		});
		const baby = await ctx.db.get(babyId);
		await ctx.scheduler.runAfter(0, internal.notifications.sendActivityNotification, {
			babyId,
			babyName: baby?.name ?? '',
			actorUserId: user._id,
			actorName: user.name,
			activityType: data.type,
			method: data.type === 'feed' ? data.method : undefined,
			amountMl: data.type === 'feed' ? data.amountMl : undefined,
			durationMin: data.type === 'feed' ? data.durationMin : undefined,
			kind: data.type === 'diaper' ? data.kind : undefined,
			severity: data.type === 'spit_up' || data.type === 'vomit' ? data.severity : undefined,
			solidAmountMl: data.type === 'solid' ? data.amountMl : undefined
		});
		return activityId;
	}
});

export const update = mutation({
	args: {
		activityId: v.id('activities'),
		occurredAt: v.number(),
		note: v.optional(v.string()),
		data: activityData
	},
	handler: async (ctx, { activityId, occurredAt, note, data }) => {
		const existing = await ctx.db.get(activityId);
		if (!existing) throw new ConvexError('not_found');
		await requireMembership(ctx, existing.babyId);
		if (existing.type !== data.type) throw new ConvexError('type_mismatch');
		await ctx.db.replace(activityId, {
			babyId: existing.babyId,
			createdBy: existing.createdBy,
			occurredAt,
			note,
			...data
		});
	}
});

export const remove = mutation({
	args: { activityId: v.id('activities') },
	handler: async (ctx, { activityId }) => {
		const existing = await ctx.db.get(activityId);
		if (!existing) return;
		await requireMembership(ctx, existing.babyId);
		await ctx.db.delete(activityId);
	}
});

export const get = query({
	args: { activityId: v.id('activities') },
	handler: async (ctx, { activityId }) => {
		const activity = await ctx.db.get(activityId);
		if (!activity) return null;
		if (!(await safeMembership(ctx, activity.babyId))) return null;
		if (activity.type === 'photo') {
			return { ...activity, photoUrl: publicUrl(activity.photoStorageId) };
		}
		return activity;
	}
});

export const timeline = query({
	args: {
		babyId: v.id('babies'),
		type: v.optional(activityType),
		paginationOpts: paginationOptsValidator
	},
	handler: async (ctx, { babyId, type, paginationOpts }) => {
		if (!(await safeMembership(ctx, babyId))) {
			return { page: [], isDone: true, continueCursor: '' };
		}
		const indexed = type
			? ctx.db
					.query('activities')
					.withIndex('by_baby_type_time', (q) => q.eq('babyId', babyId).eq('type', type))
			: ctx.db.query('activities').withIndex('by_baby_time', (q) => q.eq('babyId', babyId));
		return indexed.order('desc').paginate(paginationOpts);
	}
});

// Day bounds come from the client — it knows the user's timezone.
export const daySummary = query({
	args: { babyId: v.id('babies'), dayStartMs: v.number(), dayEndMs: v.number() },
	handler: async (ctx, { babyId, dayStartMs, dayEndMs }) => {
		if (!(await safeMembership(ctx, babyId))) return null;
		const docs = await ctx.db
			.query('activities')
			.withIndex('by_baby_time', (q) =>
				q.eq('babyId', babyId).gte('occurredAt', dayStartMs).lt('occurredAt', dayEndMs)
			)
			.collect();

		const summary = {
			feedCount: 0,
			totalMl: 0,
			breastMin: 0,
			diapers: { wet: 0, dirty: 0, mixed: 0 },
			spitUps: 0,
			vomits: 0,
			sleepMin: 0,
			solidCount: 0,
			photoCount: 0
		};
		for (const doc of docs) {
			switch (doc.type) {
				case 'feed':
					summary.feedCount += 1;
					summary.totalMl += doc.amountMl ?? 0;
					summary.breastMin += doc.durationMin ?? 0;
					break;
				case 'diaper':
					summary.diapers[doc.kind] += 1;
					break;
				case 'spit_up':
					summary.spitUps += 1;
					break;
				case 'vomit':
					summary.vomits += 1;
					break;
				case 'sleep':
					// Ongoing sleep counts up to "now"; duration is capped at the
					// day window end so a forgotten wake-up doesn't explode totals.
					summary.sleepMin += Math.round(
						(Math.min(doc.endedAt ?? Date.now(), dayEndMs) - doc.occurredAt) / 60_000
					);
					break;
				case 'solid':
					summary.solidCount += 1;
					break;
				case 'photo':
					summary.photoCount += 1;
					break;
			}
		}
		return summary;
	}
});

// Returns per-day summaries for a window of days. The client provides
// timezone-correct day boundaries (same pattern as daySummary).
export const rangeSummary = query({
	args: {
		babyId: v.id('babies'),
		days: v.array(v.object({ dayStartMs: v.number(), dayEndMs: v.number() }))
	},
	handler: async (ctx, { babyId, days }) => {
		if (!(await safeMembership(ctx, babyId))) return null;
		if (days.length === 0) return [];

		const windowStart = Math.min(...days.map((d) => d.dayStartMs));
		const windowEnd = Math.max(...days.map((d) => d.dayEndMs));

		const docs = await ctx.db
			.query('activities')
			.withIndex('by_baby_time', (q) =>
				q.eq('babyId', babyId).gte('occurredAt', windowStart).lt('occurredAt', windowEnd)
			)
			.collect();

		return days.map(({ dayStartMs, dayEndMs }) => {
			const summary = {
				feedCount: 0,
				totalMl: 0,
				breastMin: 0,
				diapers: { wet: 0, dirty: 0, mixed: 0 },
				spitUps: 0,
				vomits: 0,
				sleepMin: 0,
				solidCount: 0,
				photoCount: 0
			};
			for (const doc of docs) {
				if (doc.occurredAt < dayStartMs || doc.occurredAt >= dayEndMs) continue;
				switch (doc.type) {
					case 'feed':
						summary.feedCount += 1;
						summary.totalMl += doc.amountMl ?? 0;
						summary.breastMin += doc.durationMin ?? 0;
						break;
					case 'diaper':
						summary.diapers[doc.kind] += 1;
						break;
					case 'spit_up':
						summary.spitUps += 1;
						break;
					case 'vomit':
						summary.vomits += 1;
						break;
					case 'sleep':
						summary.sleepMin += Math.round(
							(Math.min(doc.endedAt ?? Date.now(), dayEndMs) - doc.occurredAt) / 60_000
						);
						break;
					case 'solid':
						summary.solidCount += 1;
						break;
					case 'photo':
						summary.photoCount += 1;
						break;
				}
			}
			return { dayStartMs, ...summary };
		});
	}
});

// Powers "same as last feed" defaults and the live "asleep" banner.
export const lastOfType = query({
	args: { babyId: v.id('babies'), type: activityType },
	handler: async (ctx, { babyId, type }) => {
		if (!(await safeMembership(ctx, babyId))) return null;
		return ctx.db
			.query('activities')
			.withIndex('by_baby_type_time', (q) => q.eq('babyId', babyId).eq('type', type))
			.order('desc')
			.first();
	}
});

// Resolves an S3 key to a public URL. Used by ActivityRow for photo thumbnails.
export const getPhotoUrl = query({
	args: { storageId: v.string() },
	handler: async (ctx, { storageId }) => {
		if (!(await safeUser(ctx))) return null;
		return publicUrl(storageId);
	}
});
