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

// Supabase Auth is email-based, but we let users sign in with a short username
// for convenience. A username (anything without an "@") is mapped to a synthetic
// email "<username>@plantforge.local" behind the scenes. Create the account in
// Supabase with that exact synthetic email (and "Auto Confirm User" on).
export const USERNAME_DOMAIN = 'plantforge.local'

// Turn whatever the user typed into the email Supabase expects.
export function toLoginEmail(identifier) {
  const id = (identifier || '').trim()
  if (!id) return ''
  return id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@${USERNAME_DOMAIN}`
}
