# 🪴 PlantForge

A **mobile-first plant inventory** (built for iPhone/iOS Safari, works on desktop too). Track your plants — **watering, repotting and fertilizing** — with a **photo** and notes for each, a **care history**, and a **home-screen summary** of what needs attention. Data syncs to the cloud (**Supabase**) and is protected by a login.

> Runs out of the box in **local mode** (data stored in the browser, no login) so you can try it immediately. Add Supabase for **cloud sync + login**.

## Quick start (local mode)

```bash
cd plantforge
npm install
npm run dev          # http://localhost:5190
```

No login or setup needed — it stores plants in your browser. To enable cloud sync, set up Supabase (below).

Build:

```bash
npm run build
npm run preview
```

## Features

- 📋 **Inventory** — name + plant **type** (autofill of common houseplants, but any free text works).
- 📷 **Photo per plant** — take with the camera or pick from the library.
- 💧🪴🌿 **Care tracking** — last **watered / repotted / fertilized** + intervals, with one-tap “did it today” quick actions and a **history timeline**.
- 📍☀️ **Light, location, pot size, acquired date, notes.**
- 🏠 **Home summary** — totals, what **needs water today / overdue**, due-soon, repotting due, recently added.
- 📱 **iOS-first** — installable to the home screen, safe-area aware, big tap targets, native date pickers, no zoom-on-focus.
- 🔒 **Login** (in cloud mode) via Supabase Auth + Row-Level Security.

## Cloud sync setup (Supabase)

One-time, ~10 minutes:

1. Create a free project at [supabase.com](https://supabase.com). Note the **Project URL** and **anon public key** (Settings → API).
2. In the **SQL editor**, run [`supabase/schema.sql`](supabase/schema.sql) — it creates the tables, RLS policies, and the private `plant-photos` storage bucket.
3. Create the login: **Authentication → Users → Add user**. To allow a short **username** instead of an email, enter the email as `<username>@plantforge.local` (e.g. `jo@plantforge.local`), set a password, and turn **Auto Confirm User** on. She then signs in by typing just `jo` (the app maps it to that synthetic email). A real email works too. *(Password must be ≥6 chars — Supabase's default; adjustable under Authentication → Policies.)*
4. **Local dev:** copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Restart `npm run dev` — it now uses the cloud and shows a login.
5. **Deploy (GitHub Pages):** add the same two values as repo **Variables** (Settings → Secrets and variables → Actions → **Variables** tab): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

> 🔐 The anon key is a **public** client key — safe to ship; security comes from **RLS + Auth**. **Never** put the `service_role` key in this repo or the frontend.

## Deploy to GitHub Pages

1. Push to `main` (the [workflow](.github/workflows/deploy-pages.yml) builds & deploys automatically).
2. Settings → Pages → Source = **GitHub Actions**.
3. Add the Supabase repo Variables (step 5 above) so the deployed site uses cloud sync.
4. Site: `https://<you>.github.io/plantforge/`. On the iPhone, open it and use **Share → Add to Home Screen** for an app icon.

## Tech

React 18 · Vite 8 · Tailwind 3 · React Router (HashRouter) · `@supabase/supabase-js` · `vite-plugin-pwa`. No custom server — Supabase provides the database, auth, and photo storage; a localStorage fallback powers local mode.

## Project structure

```
plantforge/
├── src/
│   ├── lib/        supabase client, db facade (cloud + local backends), care date logic
│   ├── data/       plant type autofill list + care presets
│   ├── auth/       AuthProvider + LoginPage (Supabase)
│   ├── components/ PlantCard, CareBadge, PhotoInput, TypeCombobox
│   ├── pages/      Dashboard, PlantList, PlantDetail, PlantForm, Settings
│   └── App.jsx, main.jsx
├── supabase/schema.sql        run this in Supabase
└── .github/workflows/         Pages deploy
```
