# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

👉 **Read [`AGENTS.md`](AGENTS.md) first** — it's the authoritative guide. This file is a short summary that defers to it.

## What this is

**PlantForge** — a mobile-first (iPhone/iOS) plant inventory. React 18 + Vite 8 + Tailwind 3, React Router (HashRouter), **Supabase** (Postgres + Auth + Storage) with a **localStorage fallback**, shipped as a PWA to GitHub Pages. No custom server.

## Commands

```bash
npm install
npm run dev        # http://localhost:5190 (local mode works with no env)
npm run build      # production build → dist/
npm run preview
```

Cloud mode needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (`.env` for dev; GitHub Actions **Variables** for deploy). No tests/linter — verify by building and using the UI.

## The rules that matter most

1. **Secrets/security:** only the **public anon key** in the client — **never** the `service_role` key. **Keep RLS enabled** (data protection relies on it); keep the photo bucket private (signed URLs); don't commit `.env`.
2. **One data interface:** the UI talks only to `db` from `src/lib/db.js`. Extend behavior there and keep **both** backends (`supabaseBackend.js`, `localBackend.js`) in sync, returning the same normalized camelCase plant shape.
3. **Mobile-first/iOS:** 16px inputs (no zoom), 44px tap targets, safe-area insets, native date pickers, bottom nav; test at ~375px. Don't break PWA/standalone behavior.
4. **Keep it simple** — one non-technical user; favor obvious UX, avoid heavy new deps.

## Key files

- `src/lib/db.js` — data facade (cloud + local backends).
- `src/lib/supabase.js`, `supabaseBackend.js`, `localBackend.js` — client + backends.
- `src/lib/care.js` — date/schedule logic. `src/data/plantTypes.js` — autofill + presets.
- `src/auth/` — AuthProvider + LoginPage. `src/pages/`, `src/components/` — UI.
- `supabase/schema.sql` — tables + RLS + storage bucket (run in Supabase).

## Guardrails

Don't commit secrets (especially `service_role`), bypass the `db` facade, weaken RLS, make the photo bucket public, or commit `dist/`/`.env`. Ask before schema changes, new dependencies, or auth-model changes. If the data shape changes, update **both** backends + `schema.sql` together.
