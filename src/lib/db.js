import { IS_SUPABASE } from './supabase.js'
import { localBackend } from './localBackend.js'
import { supabaseBackend } from './supabaseBackend.js'

// Single data-access facade. Picks the cloud backend when Supabase is configured,
// otherwise the local (browser) backend. The UI only talks to `db` and never
// cares which is active.
export const db = IS_SUPABASE ? supabaseBackend : localBackend
export const MODE = IS_SUPABASE ? 'cloud' : 'local'
export { IS_SUPABASE }
