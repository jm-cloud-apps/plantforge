# AGENTS.md — guidance for AI assistants working on PlantForge

Read this before making changes. It's short and concrete — the goal is for any AI assistant (Claude Code, Cursor, etc.) to make correct, safe changes to this codebase quickly.

## What this is

**PlantForge** is a **mobile-first plant inventory** built for the **iPhone/iOS Safari** experience (works on desktop too). One non-technical person uses it to track their plants — watering, repotting, fertilizing — with a photo, notes, and a care history. It must stay **simple and reliable on a phone**.

Stack: **React 18 + Vite 8 + Tailwind 3**, **React Router (HashRouter)**, **Supabase** (Postgres + Auth + Storage) with a **localStorage fallback**, packaged as an installable **PWA** and deployed to **GitHub Pages**. There is no custom server.

## Run / build

```bash
npm install
npm run dev        # http://localhost:5190
npm run build      # production build (Vite/Rolldown) → dist/, also generates PWA SW + manifest
npm run preview
```

- **Local mode** (default): with no Supabase env vars, data is stored in the browser and there's no login — the app is fully usable for dev/demo.
- **Cloud mode**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (in `.env` for dev, or as GitHub Actions **Variables** for deploy) to enable cloud sync + login.

There is no test suite or linter configured. Verify by building and exercising the UI.

## Architecture & key files

- `src/lib/supabase.js` — Supabase client; `IS_SUPABASE` flag (true when both env vars are set); `PHOTO_BUCKET`.
- `src/lib/db.js` — **the data-access facade**. Selects `supabaseBackend` or `localBackend`. **The UI only ever imports `db` from here** — it never talks to Supabase directly.
- `src/lib/supabaseBackend.js` / `src/lib/localBackend.js` — the two backends. Both return **normalized camelCase plant objects** with a resolved `photoUrl`, and expose the same methods: `listPlants, getPlant, createPlant, updatePlant, deletePlant, listEvents, logCare`.
- `src/lib/care.js` — date/schedule logic (`careStatus`, `nextDue`, `relativeDays`, `needsWater`, …). Pure, no dependencies.
- `src/data/plantTypes.js` — the autofill list of common houseplants + optional care presets (watering interval, light) used to prefill the form.
- `src/auth/AuthProvider.jsx` + `src/auth/LoginPage.jsx` — Supabase auth (session context, sign in/out). In local mode it's a no-op "always signed in".
- `src/pages/` — `Dashboard` (home summary), `PlantList`, `PlantDetail` (care actions + history), `PlantForm` (add/edit), `Settings`.
- `src/components/` — `PlantCard`, `CareBadge`, `PhotoInput`, `TypeCombobox`.
- `supabase/schema.sql` — tables, RLS policies, and the private `plant-photos` storage bucket. Run in the Supabase SQL editor.
- `.github/workflows/deploy-pages.yml` — builds with the Pages base + Supabase Variables and deploys.

## Data model

- **plants** and **care_events** (a history timeline). A care quick action (e.g. "Watered today") both **stamps the matching `last_*` field on the plant AND inserts a `care_events` row** (see `logCare`).
- **RLS** scopes every row to the signed-in user (`user_id` defaults to `auth.uid()`), so the client never sends `user_id`.
- Photos live in a **private** Storage bucket under `<user_id>/<plant_id>.<ext>` and are shown via **signed URLs**.

## The rules that matter most

1. **Security / secrets.** Only the **public anon key** belongs in the client. **Never** commit or reference the Supabase **`service_role`** key anywhere in the frontend or repo. **Keep RLS enabled** — data protection depends on RLS + Auth, not on client code. Keep the photo bucket **private** (signed URLs). Don't commit `.env` (only `.env.example`).
2. **One data interface.** Extend data behavior through `src/lib/db.js`'s methods and keep **both backends in sync**, returning the same normalized camelCase shape. Never make a page/component call Supabase directly.
3. **Mobile-first / iOS.** Keep it usable one-handed on an iPhone: inputs **≥16px** (prevents zoom-on-focus), **44px** tap targets, **safe-area** insets, native date pickers, the bottom nav + center add button. Test at ~**375px** width. Don't regress the standalone/PWA behavior.
4. **Keep it simple.** Single non-technical user — favor obvious UX over features, and avoid adding heavy dependencies without a clear reason.

## How to extend (common tasks)

- **Add a plant type** → edit `src/data/plantTypes.js` (name + optional `water` days / `light`).
- **Add a tracked field** → add the column in `supabase/schema.sql`, map it in **both** backends (`toRow`/`fromRow` in `supabaseBackend.js` and the object in `localBackend.js`), and surface it in `PlantForm` + `PlantDetail`.
- **Add a care action type** → extend the field map in `logCare` (both backends) and `EVENT_META` in `PlantDetail`.
- **Auth note**: Supabase Auth is email-based; a short **username** can be mapped to a synthetic email for convenience — keep RLS as the real protection.

## Verification

- `npm run build` must pass.
- `npm run dev` and exercise: add a plant (with a **photo**), use the quick actions (dates update **and** a history entry appears), check **due/overdue** badges and the home summary, and search.
- Cloud mode: set `.env`, confirm sign-in and that data **persists across reload** (and ideally across devices).
- Check the layout at **iPhone width**.

## Guardrails

- ✅ Do: improve mobile UX, add plant types / care fields, keep both backends in sync, preserve RLS.
- ⚠️ Ask first: schema changes, new dependencies, changes to the auth model, anything that sends data outside the user's own Supabase project.
- ❌ Don't: commit secrets (especially `service_role`), bypass the `db` facade, weaken/disable RLS, make the photo bucket public, or commit `dist/` or `.env`.

## Checklist before finishing

- [ ] `npm run build` passes; dev exercised on a phone-width viewport.
- [ ] If the data shape changed, **both** backends + `supabase/schema.sql` updated together.
- [ ] No secrets committed; RLS intact; photo bucket still private.
- [ ] Mobile ergonomics preserved (16px inputs, 44px targets, safe areas).
