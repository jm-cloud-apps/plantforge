import { createClient } from '@supabase/supabase-js'

// Public Supabase config (safe to ship in the client). When BOTH are present we
// run in cloud mode; otherwise the app falls back to local-only mode (data in
// the browser, no login) so it works before any Supabase setup.
const URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const IS_SUPABASE = Boolean(URL && ANON)

export const supabase = IS_SUPABASE
  ? createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const PHOTO_BUCKET = 'plant-photos'
