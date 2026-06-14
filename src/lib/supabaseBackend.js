import { supabase, PHOTO_BUCKET } from './supabase.js'

// Cloud backend (Supabase Postgres + Storage). RLS scopes every row to the
// signed-in user, and user_id defaults to auth.uid() on insert, so we never
// send it from the client.

const COLS =
  'id,name,type,photo_path,location,light,pot_size,acquired_on,last_watered,water_interval_days,last_repotted,repot_interval_days,last_fertilized,fertilize_interval_days,notes,created_at,updated_at'

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

async function fromRow(row) {
  let photoUrl = null
  if (row.photo_path) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(row.photo_path, 3600)
    photoUrl = data?.signedUrl || null
  }
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
    lastRepotted: row.last_repotted,
    repotIntervalDays: row.repot_interval_days,
    lastFertilized: row.last_fertilized,
    fertilizeIntervalDays: row.fertilize_interval_days,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id
}

async function uploadPhoto(plantId, file) {
  const userId = await currentUserId()
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${plantId}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return path
}

export const supabaseBackend = {
  async listPlants() {
    const { data, error } = await supabase.from('plants').select(COLS).order('name', { ascending: true })
    if (error) throw error
    return Promise.all((data || []).map(fromRow))
  },

  async getPlant(id) {
    const { data, error } = await supabase.from('plants').select(COLS).eq('id', id).single()
    if (error) throw error
    return fromRow(data)
  },

  async createPlant(data) {
    const { data: inserted, error } = await supabase.from('plants').insert(toRow(data)).select(COLS).single()
    if (error) throw error
    if (data.photoFile) {
      const path = await uploadPhoto(inserted.id, data.photoFile)
      const { data: updated } = await supabase.from('plants').update({ photo_path: path }).eq('id', inserted.id).select(COLS).single()
      return fromRow(updated || inserted)
    }
    return fromRow(inserted)
  },

  async updatePlant(id, data) {
    const patch = toRow(data)
    patch.updated_at = new Date().toISOString()
    if (data.photoFile) patch.photo_path = await uploadPhoto(id, data.photoFile)
    const { data: updated, error } = await supabase.from('plants').update(patch).eq('id', id).select(COLS).single()
    if (error) throw error
    return fromRow(updated)
  },

  async deletePlant(id) {
    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) throw error
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
    const eventDate = date || new Date().toISOString().slice(0, 10)
    const field = { watered: 'last_watered', repotted: 'last_repotted', fertilized: 'last_fertilized' }[type]
    if (field) await supabase.from('plants').update({ [field]: eventDate, updated_at: new Date().toISOString() }).eq('id', plantId)
    const { data, error } = await supabase
      .from('care_events')
      .insert({ plant_id: plantId, type, event_date: eventDate, note: note || null })
      .select('id,plant_id,type,event_date,note,created_at')
      .single()
    if (error) throw error
    return { id: data.id, plantId: data.plant_id, type: data.type, eventDate: data.event_date, note: data.note, createdAt: data.created_at }
  },
}
