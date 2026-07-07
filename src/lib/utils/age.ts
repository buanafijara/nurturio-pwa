import { m } from '$lib/paraglide/messages';

// "3 days", "2 weeks", "5 months", "1 year 2 months" — from a YYYY-MM-DD date of birth.
export function formatAge(dateOfBirth: string, now = new Date()): string {
	const dob = new Date(`${dateOfBirth}T00:00:00`);
	const days = Math.max(0, Math.floor((now.getTime() - dob.getTime()) / 86_400_000));
	if (days < 14) return m.age_days({ count: days });
	if (days < 60) return m.age_weeks({ count: Math.floor(days / 7) });

	let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
	if (now.getDate() < dob.getDate()) months -= 1;
	if (months < 12) return m.age_months({ count: months });
	const years = Math.floor(months / 12);
	const rest = months % 12;
	return rest === 0
		? m.age_years({ count: years })
		: `${m.age_years({ count: years })} ${m.age_months({ count: rest })}`;
}
