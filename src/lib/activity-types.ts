import { Baby, Camera, CloudDrizzle, Droplets, Moon, Utensils, Waves, type IconProps } from '@lucide/svelte';
import type { Component } from 'svelte';
import { m } from '$lib/paraglide/messages';

export const ACTIVITY_TYPES = ['feed', 'diaper', 'spit_up', 'vomit', 'sleep', 'solid', 'photo'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const activityIcons: Record<ActivityType, Component<IconProps>> = {
	feed: Baby,
	diaper: Droplets,
	spit_up: CloudDrizzle,
	vomit: Waves,
	sleep: Moon,
	solid: Utensils,
	photo: Camera
};

export function activityLabel(type: ActivityType): string {
	switch (type) {
		case 'feed':
			return m.activity_feed();
		case 'diaper':
			return m.activity_diaper();
		case 'spit_up':
			return m.activity_spit_up();
		case 'vomit':
			return m.activity_vomit();
		case 'sleep':
			return m.activity_sleep();
		case 'solid':
			return m.activity_solid();
		case 'photo':
			return m.activity_photo();
	}
}

export function isActivityType(value: string): value is ActivityType {
	return (ACTIVITY_TYPES as readonly string[]).includes(value);
}
