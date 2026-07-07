import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Shared fields for every activity. occurredAt is user-editable (parents log
// after the fact); _creationTime remains the audit record.
const activityBase = {
	babyId: v.id('babies'),
	occurredAt: v.number(),
	createdBy: v.id('users'),
	note: v.optional(v.string())
};

export const feedMethod = v.union(
	v.literal('breast_left'),
	v.literal('breast_right'),
	v.literal('breast_both'),
	v.literal('bottle_breastmilk'),
	v.literal('bottle_formula')
);
export const diaperKind = v.union(v.literal('wet'), v.literal('dirty'), v.literal('mixed'));
export const severity = v.union(v.literal('small'), v.literal('medium'), v.literal('large'));

export default defineSchema({
	// App-level profile. Auth users/sessions live in the Better Auth
	// component's own tables; authId links the two.
	users: defineTable({
		authId: v.string(),
		name: v.string(),
		imageUrl: v.optional(v.string()),
		locale: v.optional(v.union(v.literal('id'), v.literal('en')))
	}).index('by_authId', ['authId']),

	babies: defineTable({
		name: v.string(),
		dateOfBirth: v.string(), // "YYYY-MM-DD" — a calendar date, not an instant
		sex: v.union(v.literal('male'), v.literal('female')),
		photoStorageId: v.optional(v.id('_storage')),
		createdBy: v.id('users'),
		archivedAt: v.optional(v.number())
	}),

	// owner: manages caregivers, can delete/archive the baby.
	// caregiver: can log and edit activities.
	memberships: defineTable({
		babyId: v.id('babies'),
		userId: v.id('users'),
		role: v.union(v.literal('owner'), v.literal('caregiver'))
	})
		.index('by_baby', ['babyId'])
		.index('by_user', ['userId'])
		.index('by_baby_user', ['babyId', 'userId']),

	invites: defineTable({
		babyId: v.id('babies'),
		code: v.string(),
		createdBy: v.id('users'),
		expiresAt: v.number(),
		usedBy: v.optional(v.id('users')),
		revokedAt: v.optional(v.number())
	})
		.index('by_code', ['code'])
		.index('by_baby', ['babyId']),

	// One row per device per user. Multiple devices = multiple rows.
	pushSubscriptions: defineTable({
		userId: v.id('users'),
		endpoint: v.string(),
		p256dh: v.string(),
		auth: v.string()
	})
		.index('by_user', ['userId'])
		.index('by_endpoint', ['endpoint']),

	// One polymorphic table: the timeline ("everything for baby X, newest
	// first") is a single index scan, and future types (e.g. MPASI solids)
	// are additive union members — no migration.
	activities: defineTable(
		v.union(
			v.object({
				...activityBase,
				type: v.literal('feed'),
				method: feedMethod,
				amountMl: v.optional(v.number()), // bottle feeds
				durationMin: v.optional(v.number()) // direct nursing
			}),
			v.object({
				...activityBase,
				type: v.literal('diaper'),
				kind: diaperKind,
				stoolColor: v.optional(v.string()),
				stoolConsistency: v.optional(v.string())
			}),
			v.object({
				...activityBase,
				type: v.literal('spit_up'),
				severity: v.optional(severity)
			}),
			v.object({
				...activityBase,
				type: v.literal('vomit'),
				severity: v.optional(severity)
			}),
			v.object({
				...activityBase,
				type: v.literal('sleep'), // occurredAt = fell asleep
				endedAt: v.optional(v.number()) // undefined = still sleeping
			}),
			v.object({
				...activityBase,
				type: v.literal('solid'),
				amountMl: v.optional(v.number())
			}),
			v.object({
				...activityBase,
				type: v.literal('photo'),
				photoStorageId: v.id('_storage')
			})
		)
	)
		.index('by_baby_time', ['babyId', 'occurredAt'])
		.index('by_baby_type_time', ['babyId', 'type', 'occurredAt'])
});
