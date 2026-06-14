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
  last_repotted date,   repot_interval_days int,
  last_fertilized date, fertilize_interval_days int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists care_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid not null references plants(id) on delete cascade,
  type text not null,                  -- 'watered'|'repotted'|'fertilized'|'note'|'acquired'
  event_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists care_events_plant_idx on care_events(plant_id);

-- ── Row Level Security: each user only sees their own rows ──────────────────
alter table plants enable row level security;
alter table care_events enable row level security;

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

-- Objects are stored under "<user_id>/<plant_id>.<ext>"; allow each user to
-- manage only objects whose first path segment is their own user id.
drop policy if exists "own plant photos" on storage.objects;
create policy "own plant photos" on storage.objects for all
  to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
