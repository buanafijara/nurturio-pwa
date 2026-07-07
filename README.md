# Nurtur.io

Mobile-first PWA companion for parents of newborns (0–2 years): track feeds, diapers, spit-up, vomit, and sleep — with real-time sync between caregivers.

**Stack:** SvelteKit (Svelte 5) · Convex (real-time DB) · Better Auth · shadcn-svelte + Tailwind v4 · Paraglide i18n (id/en) · @vite-pwa/sveltekit

## Development

Requires Node 24 (`.nvmrc` provided — `nvm use`).

```bash
npm install

# Terminal 1 — Convex backend (local, no account needed):
CONVEX_AGENT_MODE=anonymous npx convex dev

# Terminal 2 — app:
npm run dev
```

Open http://localhost:5173. Two browser profiles + an invite link demo the real-time caregiver sync.

Useful commands: `npm run check` (svelte-check), `npm run lint`, `npm run build && npm run preview` (production + service worker).

## Architecture notes

- **Brand identity lives in one file:** `src/lib/styles/theme.css`. Every color, radius, and font in the app resolves to tokens defined there — rebrand by editing that file only. Components must use semantic utilities (`bg-primary`, `text-muted-foreground`), never raw colors.
- **Schema:** one polymorphic `activities` table (discriminated union on `type`) — the timeline is a single index scan, and future activity types (MPASI solids) are additive union members, no migration. See `convex/schema.ts`.
- **Auth:** Better Auth runs _inside_ Convex via `@convex-dev/better-auth`; sessions and users live in your Convex deployment. SvelteKit proxies `/api/auth/*` to Convex.
- **Authorization:** every Convex function goes through `convex/lib/access.ts` (`requireMembership` / `requireOwnership`); queries use `safe*` variants that return empty results during the websocket auth handshake.
- **i18n:** all strings are Paraglide `m.*()` messages (`messages/{en,id}.json`); locale persists via cookie/localStorage, no URL prefix.
- **`occurredAt` is user-editable** (parents log after the fact); `_creationTime` is the audit record.

## Going to production

1. **Convex cloud:** `npx convex login`, then `npx convex dev --configure new` to create a cloud project (replaces the local anonymous deployment in `.env.local`). Re-set env vars on the new deployment:
   `npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)` and `npx convex env set SITE_URL https://<your-domain>`.
2. **Deploy** the SvelteKit app to Vercel (adapter-auto). Set `PUBLIC_CONVEX_URL` / `PUBLIC_CONVEX_SITE_URL` env vars from the Convex dashboard. Production pushes: `npx convex deploy`.
3. **Google sign-in** (recommended hero button for the Indonesian market): create an OAuth client in Google Cloud Console, then
   `npx convex env set GOOGLE_CLIENT_ID ...`, `npx convex env set GOOGLE_CLIENT_SECRET ...`, and set `PUBLIC_GOOGLE_AUTH=true` in the frontend env. The button appears automatically.

## Roadmap (post-MVP)

- **MPASI planner** — add a `solid` member to the `activities` union (`foodIds`, `amountGrams`, allergy `reaction`), plus `foods` and `mealPlans` tables reusing the `babyId` + membership pattern.
- **Growth tracking** — separate `measurements` table; `dateOfBirth` + `sex` are already exactly what WHO z-score curves need.
