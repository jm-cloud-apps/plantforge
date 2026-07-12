import { supabase, PHOTO_BUCKET } from './supabase.js'
import { today } from './care.js'

// Cloud backend (Supabase Postgres + Storage). RLS scopes every row to the
// signed-in user, and user_id defaults to auth.uid() on insert, so we never
// send it from the client.

const COLS =
  'id,name,type,photo_path,location,light,pot_size,acquired_on,last_watered,water_interval_days,last_kelped,kelp_interval_days,last_repotted,repot_interval_days,last_fertilized,fertilize_interval_days,notes,last_photo_on,created_at,updated_at'

// camelCase (UI) → snake_case (DB), coercing '' to null and numbers to ints.
function toRow(d) {
  const map = {
    name: d.name,
    type: nz(d.type),
    location: nz(d.location),
    light: nz(d.light),
    pot_size: nz(d.potSize),
    acquired_on: nz(d.acquiredOn),
    last_watered: nz(d.lastWatered),
    water_interval_days: ni(d.waterIntervalDays),
    last_kelped: nz(d.lastKelped),
    kelp_interval_days: ni(d.kelpIntervalDays),
    last_repotted: nz(d.lastRepotted),
    repot_interval_days: ni(d.repotIntervalDays),
    last_fertilized: nz(d.lastFertilized),
    fertilize_interval_days: ni(d.fertilizeIntervalDays),
    notes: nz(d.notes),
  }
  // Only include keys the caller actually provided (so updates are partial).
  const row = {}
  const provided = {
    name: 'name', type: 'type', location: 'location', light: 'light', potSize: 'pot_size',
    acquiredOn: 'acquired_on', lastWatered: 'last_watered', waterIntervalDays: 'water_interval_days',
    lastKelped: 'last_kelped', kelpIntervalDays: 'kelp_interval_days',
    lastRepotted: 'last_repotted', repotIntervalDays: 'repot_interval_days',
    lastFertilized: 'last_fertilized', fertilizeIntervalDays: 'fertilize_interval_days', notes: 'notes',
  }
  for (const [camel, snake] of Object.entries(provided)) {
    if (camel in d) row[snake] = map[snake]
  }
  return row
}
const nz = (v) => (v === '' || v === undefined ? null : v)
const ni = (v) => (v === '' || v === undefined || v === null ? null : parseInt(v, 10))

// ── Signed-URL cache ────────────────────────────────────────────────────────
// Storage signed URLs are minted per request and carry a short-lived token, so
// re-fetching the plant list (e.g. switching tabs) otherwise fires one Storage
// round-trip *per photo* and hands the browser a brand-new URL each time —
// defeating its image cache. We cache URLs by path for their lifetime (minus a
// safety skew) and mint missing ones in a single batch call.
const SIGN_TTL = 3600 // seconds the signed URL stays valid
const SIGN_SKEW = 120 // re-mint this many seconds before it actually expires
const urlCache = new Map() // photo_path -> { url, exp (ms epoch) }

function cachedUrl(path) {
  const hit = urlCache.get(path)
  if (hit && hit.exp > Date.now() + SIGN_SKEW * 1000) return hit.url
  return null
}
function putUrl(path, url) {
  urlCache.set(path, { url, exp: Date.now() + SIGN_TTL * 1000 })
}

// Resolve many paths to signed URLs, reusing the cache and batching the misses
// into one createSignedUrls() call. Returns a Map<path, url>.
async function signPaths(paths) {
  const out = new Map()
  const missing = []
  for (const p of paths) {
    if (!p) continue
    const c = cachedUrl(p)
    if (c) out.set(p, c)
    else if (!missing.includes(p)) missing.push(p)
  }
  if (missing.length) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(missing, SIGN_TTL)
    for (const item of data || []) {
      if (item?.signedUrl && item?.path) {
        putUrl(item.path, item.signedUrl)
        out.set(item.path, item.signedUrl)
      }
    }
  }
  return out
}

// Pure DB-row → UI-plant mapper; photoUrl is supplied by the caller (already
// resolved via signPaths) so this stays synchronous.
function rowToPlant(row, photoUrl = null) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    photoUrl,
    photoPath: row.photo_path,
    location: row.location,
    light: row.light,
    potSize: row.pot_size,
    acquiredOn: row.acquired_on,
    lastWatered: row.last_watered,
    waterIntervalDays: row.water_interval_days,
    lastKelped: row.last_kelped,
    kelpIntervalDays: row.kelp_interval_days,
    lastRepotted: row.last_repotted,
    repotIntervalDays: row.repot_interval_days,
    lastFertilized: row.last_fertilized,
    fertilizeIntervalDays: row.fertilize_interval_days,
    notes: row.notes,
    lastPhotoOn: row.last_photo_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fromRow(row) {
  const photoUrl = row.photo_path ? await signedUrl(row.photo_path) : null
  return rowToPlant(row, photoUrl)
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id
}

// Each photo gets a unique nested path "<userId>/<plantId>/<photoId>.<ext>" so
// new photos never overwrite old ones (the foldername[1] = userId storage
// policy still applies since the first segment is the user id).
async function uploadPhotoFile(plantId, file) {
  const userId = await currentUserId()
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${plantId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

async function signedUrl(path) {
  if (!path) return null
  const c = cachedUrl(path)
  if (c) return c
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGN_TTL)
  if (data?.signedUrl) putUrl(path, data.signedUrl)
  return data?.signedUrl || null
}

// Point the plant's cover + last_photo_on at its most recent photo (or clear).
async function refreshCover(plantId) {
  const { data } = await supabase
    .from('plant_photos')
    .select('photo_path,created_at')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(1)
  const latest = data?.[0]
  await supabase
    .from('plants')
    .update({
      photo_path: latest?.photo_path ?? null,
      last_photo_on: latest?.created_at ? latest.created_at.slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', plantId)
  invalidateList() // cover thumbnail changed
}

// ── Plant-list cache ─────────────────────────────────────────────────────────
// The Dashboard and the Plants tab each fetch the whole list independently, so
// caching it briefly makes tab switches instant instead of re-querying + re-
// signing every photo. Any local write invalidates it, so the only staleness
// window is edits made on another device (fine for a personal app).
const LIST_TTL = 30000 // ms
let listCache = null // { at, plants }
const invalidateList = () => {
  listCache = null
}

export const supabaseBackend = {
  async listPlants({ force = false } = {}) {
    if (!force && listCache && Date.now() - listCache.at < LIST_TTL) return listCache.plants
    const { data, error } = await supabase.from('plants').select(COLS).order('name', { ascending: true })
    if (error) throw error
    const rows = data || []
    const urls = await signPaths(rows.map((r) => r.photo_path))
    const plants = rows.map((r) => rowToPlant(r, r.photo_path ? urls.get(r.photo_path) || null : null))
    listCache = { at: Date.now(), plants }
    return plants
  },

  async getPlant(id) {
    const { data, error } = await supabase.from('plants').select(COLS).eq('id', id).single()
    if (error) throw error
    return fromRow(data)
  },

  async createPlant(data) {
    const { data: inserted, error } = await supabase.from('plants').insert(toRow(data)).select('id').single()
    if (error) throw error
    invalidateList()
    if (data.photoFile) await this.addPhoto(inserted.id, data.photoFile)
    return this.getPlant(inserted.id)
  },

  async updatePlant(id, data) {
    const patch = toRow(data)
    patch.updated_at = new Date().toISOString()
    const { error } = await supabase.from('plants').update(patch).eq('id', id)
    if (error) throw error
    invalidateList()
    if (data.photoFile) await this.addPhoto(id, data.photoFile)
    else if (data.photoFile === null) await this.removeCover(id)
    return this.getPlant(id)
  },

  async deletePlant(id) {
    // plant_photos rows cascade on delete; remove the storage objects too.
    const { data: photos } = await supabase.from('plant_photos').select('photo_path').eq('plant_id', id)
    const paths = (photos || []).map((p) => p.photo_path).filter(Boolean)
    if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) throw error
    invalidateList()
  },

  // ── Photo history ─────────────────────────────────────────────────────────
  async listPhotos(plantId) {
    const { data, error } = await supabase
      .from('plant_photos')
      .select('id,photo_path,created_at')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data || []
    const urls = await signPaths(rows.map((r) => r.photo_path))
    return rows.map((r) => ({ id: r.id, url: r.photo_path ? urls.get(r.photo_path) || null : null, createdAt: r.created_at }))
  },

  async addPhoto(plantId, file) {
    const path = await uploadPhotoFile(plantId, file)
    const { error } = await supabase.from('plant_photos').insert({ plant_id: plantId, photo_path: path })
    if (error) throw error
    await refreshCover(plantId)
  },

  async removePhoto(plantId, photoId) {
    const { data: row } = await supabase.from('plant_photos').select('photo_path').eq('id', photoId).single()
    if (row?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([row.photo_path])
    const { error } = await supabase.from('plant_photos').delete().eq('id', photoId)
    if (error) throw error
    await refreshCover(plantId)
  },

  // Remove the current cover (most recent photo); cover reverts to the previous.
  async removeCover(plantId) {
    const { data } = await supabase
      .from('plant_photos')
      .select('id')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data?.[0]?.id) return this.removePhoto(plantId, data[0].id)
    // No history rows (legacy single photo) — just clear the cover.
    await supabase
      .from('plants')
      .update({ photo_path: null, last_photo_on: null, updated_at: new Date().toISOString() })
      .eq('id', plantId)
    invalidateList()
  },

  async listEvents(plantId) {
    const { data, error } = await supabase
      .from('care_events')
      .select('id,plant_id,type,event_date,note,created_at')
      .eq('plant_id', plantId)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((e) => ({
      id: e.id, plantId: e.plant_id, type: e.type, eventDate: e.event_date, note: e.note, createdAt: e.created_at,
    }))
  },

  async logCare(plantId, type, { date, note } = {}) {
    const eventDate = date || today() // local calendar date (device timezone)
    const field = { watered: 'last_watered', kelped: 'last_kelped', repotted: 'last_repotted', fertilized: 'last_fertilized' }[type]
    if (field) {
      await supabase.from('plants').update({ [field]: eventDate, updated_at: new Date().toISOString() }).eq('id', plantId)
      invalidateList() // watering/repot status shown in the list changed
    }
    const { data, error } = await supabase
      .from('care_events')
      .insert({ plant_id: plantId, type, event_date: eventDate, note: note || null })
      .select('id,plant_id,type,event_date,note,created_at')
      .single()
    if (error) throw error
    return { id: data.id, plantId: data.plant_id, type: data.type, eventDate: data.event_date, note: data.note, createdAt: data.created_at }
  },

  // User preferences (collection name, …), one row per user in app_settings.
  // Reads are resilient: if the table doesn't exist yet (migration not run),
  // fall back to defaults rather than breaking the page.
  async getSettings() {
    try {
      const { data, error } = await supabase.from('app_settings').select('collection_name').maybeSingle()
      if (error) throw error
      return { collectionName: data?.collection_name || null }
    } catch {
      return { collectionName: null }
    }
  },

  async updateSettings(patch) {
    const userId = await currentUserId()
    const row = { user_id: userId, updated_at: new Date().toISOString() }
    if ('collectionName' in patch) row.collection_name = patch.collectionName || null
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(row, { onConflict: 'user_id' })
      .select('collection_name')
      .single()
    if (error) throw error
    return { collectionName: data?.collection_name || null }
  },

  // Undo a logged care entry, then re-derive the matching last_* date from the
  // most recent remaining event of that type (or clear it if none are left).
  async deleteCareEvent(event) {
    if (!event?.id) return
    const { error } = await supabase.from('care_events').delete().eq('id', event.id)
    if (error) throw error
    invalidateList() // may change the plant's last_* status shown in the list
    const field = { watered: 'last_watered', kelped: 'last_kelped', repotted: 'last_repotted', fertilized: 'last_fertilized' }[event.type]
    if (field) {
      const { data } = await supabase
        .from('care_events')
        .select('event_date')
        .eq('plant_id', event.plantId)
        .eq('type', event.type)
        .order('event_date', { ascending: false })
        .limit(1)
      const latest = data?.[0]?.event_date ?? null
      await supabase.from('plants').update({ [field]: latest, updated_at: new Date().toISOString() }).eq('id', event.plantId)
    }
  },
}
