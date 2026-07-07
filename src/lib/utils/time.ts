import { m } from '$lib/paraglide/messages';

export function formatAgo(fromMs: number, nowMs = Date.now()): string {
	const minutes = Math.max(0, Math.floor((nowMs - fromMs) / 60_000));
	if (minutes < 1) return m.just_now();
	if (minutes < 60) return m.ago_minutes({ min: minutes });
	return m.ago_hours({ hours: Math.floor(minutes / 60), min: minutes % 60 });
}

export function formatDuration(minutes: number): string {
	if (minutes < 60) return m.duration_m({ min: minutes });
	return m.duration_h_m({ hours: Math.floor(minutes / 60), min: minutes % 60 });
}

export function dayBounds(date = new Date()): { dayStartMs: number; dayEndMs: number } {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	return { dayStartMs: start.getTime(), dayEndMs: start.getTime() + 86_400_000 };
}

export function pastDayBounds(n: number): Array<{ dayStartMs: number; dayEndMs: number }> {
	return Array.from({ length: n }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - (n - 1 - i));
		return dayBounds(d);
	});
}
