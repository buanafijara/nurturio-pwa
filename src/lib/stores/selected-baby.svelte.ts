import { browser } from '$app/environment';
import type { Id } from '$lib/convex';

const STORAGE_KEY = 'nurturio:selectedBabyId';

class SelectedBaby {
	id = $state<Id<'babies'> | null>(
		browser ? (localStorage.getItem(STORAGE_KEY) as Id<'babies'> | null) : null
	);

	select(id: Id<'babies'>) {
		this.id = id;
		if (browser) localStorage.setItem(STORAGE_KEY, id);
	}

	clear() {
		this.id = null;
		if (browser) localStorage.removeItem(STORAGE_KEY);
	}
}

export const selectedBaby = new SelectedBaby();
