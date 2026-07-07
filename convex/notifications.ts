"use node";

import webpush from 'web-push';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

const LABELS: Record<string, Record<'id' | 'en', string>> = {
	feed: { id: 'Menyusu', en: 'Feeding' },
	diaper: { id: 'Popok', en: 'Diaper' },
	spit_up: { id: 'Gumoh', en: 'Spit-up' },
	vomit: { id: 'Muntah', en: 'Vomit' },
	sleep: { id: 'Tidur', en: 'Sleep' },
	solid: { id: 'MPASI', en: 'Solid food' },
	photo: { id: 'Foto', en: 'Photo' }
};

const METHOD_LABELS: Record<string, Record<'id' | 'en', string>> = {
	breast_left: { id: 'Payudara kiri', en: 'Left breast' },
	breast_right: { id: 'Payudara kanan', en: 'Right breast' },
	breast_both: { id: 'Kedua payudara', en: 'Both breasts' },
	bottle_breastmilk: { id: 'Botol ASI', en: 'Bottle – breast milk' },
	bottle_formula: { id: 'Botol formula', en: 'Bottle – formula' }
};

const KIND_LABELS: Record<string, Record<'id' | 'en', string>> = {
	wet: { id: 'Pipis', en: 'Wet' },
	dirty: { id: 'Pup', en: 'Dirty' },
	mixed: { id: 'Campur', en: 'Mixed' }
};

const SEV_LABELS: Record<string, Record<'id' | 'en', string>> = {
	small: { id: 'Sedikit', en: 'A little' },
	medium: { id: 'Sedang', en: 'Medium' },
	large: { id: 'Banyak', en: 'A lot' }
};

function buildBody(
	locale: 'id' | 'en',
	args: {
		activityType: string;
		method?: string;
		amountMl?: number;
		durationMin?: number;
		kind?: string;
		severity?: string;
		solidAmountMl?: number;
	}
): string {
	const l = locale === 'id' ? 'id' : 'en';
	const actLabel = LABELS[args.activityType]?.[l] ?? args.activityType;
	let detail = '';

	if (args.activityType === 'feed') {
		const parts: string[] = [];
		if (args.method) parts.push(METHOD_LABELS[args.method]?.[l] ?? '');
		if (args.durationMin) parts.push(l === 'id' ? `${args.durationMin} mnt` : `${args.durationMin} min`);
		else if (args.amountMl) parts.push(`${args.amountMl} ml`);
		detail = parts.filter(Boolean).join(', ');
	} else if (args.activityType === 'diaper' && args.kind) {
		detail = KIND_LABELS[args.kind]?.[l] ?? '';
	} else if ((args.activityType === 'spit_up' || args.activityType === 'vomit') && args.severity) {
		detail = SEV_LABELS[args.severity]?.[l] ?? '';
	} else if (args.activityType === 'solid' && args.solidAmountMl) {
		detail = `${args.solidAmountMl} ml`;
	}

	return detail ? `${actLabel} · ${detail}` : actLabel;
}

export const sendActivityNotification = internalAction({
	args: {
		babyId: v.id('babies'),
		babyName: v.string(),
		actorUserId: v.id('users'),
		actorName: v.string(),
		activityType: v.string(),
		method: v.optional(v.string()),
		amountMl: v.optional(v.number()),
		durationMin: v.optional(v.number()),
		kind: v.optional(v.string()),
		severity: v.optional(v.string()),
		solidAmountMl: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		webpush.setVapidDetails(
			process.env.VAPID_SUBJECT!,
			process.env.VAPID_PUBLIC_KEY!,
			process.env.VAPID_PRIVATE_KEY!
		);

		const subscriptions = await ctx.runQuery(
			internal.pushSubscriptions.getOtherCaregiverSubscriptions,
			{ babyId: args.babyId, actorUserId: args.actorUserId }
		);

		for (const sub of subscriptions) {
			const body = buildBody(sub.locale, args);
			const payload = JSON.stringify({
				title: args.babyName,
				body: `${args.actorName}: ${body}`,
				icon: '/icons/icon-192.png',
				badge: '/icons/icon-192.png',
				data: { url: '/' }
			});

			try {
				await webpush.sendNotification(
					{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
					payload
				);
			} catch (err: unknown) {
				const status = (err as { statusCode?: number }).statusCode;
				console.error(`[push] send failed status=${status} endpoint=${sub.endpoint.slice(0, 60)}…`, err);
				// 410/404 = subscription expired; 401/403 = VAPID key mismatch (stale
				// subscription from before a key rotation). All three are permanent failures.
				if (status === 410 || status === 404 || status === 401 || status === 403) {
					await ctx.runMutation(internal.pushSubscriptions.deleteByEndpoint, {
						endpoint: sub.endpoint
					});
				}
			}
		}
	}
});
