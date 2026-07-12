-- PlantForge — Supabase schema, RLS, and storage policies.
-- Run this in your Supabase project's SQL editor (one time).

-- ── Tables ────────────────────────────────────────────────────────────────
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text,
  photo_path text,
  location text,
  light text,                          -- 'low' | 'medium' | 'bright'
  pot_size text,
  acquired_on date,
  last_watered date,    water_interval_days int,
  last_kelped date,     kelp_interval_days int,       -- seaweed/kelp feeding
  last_repotted date,   repot_interval_days int,
  last_fertilized date, fertilize_interval_days int,
  notes text,
  last_photo_on date,                  -- date of the most recent photo (for the re-photo reminder)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration (safe to re-run): backfill the Kelp care columns on existing installs
-- that predate them. New projects already get them from the create table above.
alter table plants add column if not exists last_kelped date;
alter table plants add column if not exists kelp_interval_days int;

-- Photo history: many photos per plant, each timestamped. The plant's
-- photo_path mirrors the most recent one (the cover shown on cards).
create table if not exists plant_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid not null references plants(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists plant_photos_plant_idx on plant_photos(plant_id);

create table if not exists care_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid not null references plants(id) on delete cascade,
  type text not null,                  -- 'watered'|'kelped'|'repotted'|'fertilized'|'note'|'acquired'
  event_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists care_events_plant_idx on care_events(plant_id);

-- Per-user preferences (one row per user). Currently just the collection name
-- shown as the home-screen heading; add columns here for future settings.
create table if not exists app_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  collection_name text,
  updated_at timestamptz not null default now()
);

-- ── Row Level Security: each user only sees their own rows ──────────────────
alter table plants enable row level security;
alter table care_events enable row level security;
alter table app_settings enable row level security;
alter table plant_photos enable row level security;

drop policy if exists "own settings" on app_settings;
create policy "own settings" on app_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own plant_photos" on plant_photos;
create policy "own plant_photos" on plant_photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own plants" on plants;
create policy "own plants" on plants for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own care_events" on care_events;
create policy "own care_events" on care_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: private bucket for plant photos ───────────────────────────────
-- Create the bucket (id = name = 'plant-photos'), private.
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', false)
on conflict (id) do nothing;

-- Objects are stored under "<user_id>/<plant_id>/<photo_id>.<ext>"; allow each
-- user to manage only objects whose first path segment is their own user id.
drop policy if exists "own plant photos" on storage.objects;
create policy "own plant photos" on storage.objects for all
  to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
