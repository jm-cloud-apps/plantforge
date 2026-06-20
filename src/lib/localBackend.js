// Local-only data backend (no Supabase). Stores everything in localStorage,
// including photos as base64 data URLs. Used when Supabase isn't configured so
// the app is fully usable for local/demo use and development.

import { today } from './care.js'

const PLANTS_KEY = 'plantforge.plants.v1'
const EVENTS_KEY = 'plantforge.events.v1'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}
function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Normalized plant shape used across the UI (photo stored inline as a data URL).
export const localBackend = {
  async listPlants() {
    return read(PLANTS_KEY).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  },

  async getPlant(id) {
    return read(PLANTS_KEY).find((p) => p.id === id) || null
  },

  async createPlant(data) {
    const plants = read(PLANTS_KEY)
    const now = new Date().toISOString()
    const plant = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      photoUrl: null,
      ...stripPhotoFile(data),
    }
    if (data.photoFile) plant.photoUrl = await fileToDataUrl(data.photoFile)
    plants.push(plant)
    write(PLANTS_KEY, plants)
    return plant
  },

  async updatePlant(id, data) {
    const plants = read(PLANTS_KEY)
    const i = plants.findIndex((p) => p.id === id)
    if (i === -1) return null
    const next = { ...plants[i], ...stripPhotoFile(data), updatedAt: new Date().toISOString() }
    if (data.photoFile) next.photoUrl = await fileToDataUrl(data.photoFile)
    plants[i] = next
    write(PLANTS_KEY, plants)
    return next
  },

  async deletePlant(id) {
    write(PLANTS_KEY, read(PLANTS_KEY).filter((p) => p.id !== id))
    write(EVENTS_KEY, read(EVENTS_KEY).filter((e) => e.plantId !== id))
  },

  async listEvents(plantId) {
    return read(EVENTS_KEY)
      .filter((e) => e.plantId === plantId)
      .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  },

  async logCare(plantId, type, { date, note } = {}) {
    const eventDate = date || today() // local calendar date (device timezone)
    // 1) stamp the matching last_* field on the plant
    const field = { watered: 'lastWatered', repotted: 'lastRepotted', fertilized: 'lastFertilized' }[type]
    if (field) await this.updatePlant(plantId, { [field]: eventDate })
    // 2) append a history event
    const events = read(EVENTS_KEY)
    const ev = { id: uid(), plantId, type, eventDate, note: note || null, createdAt: new Date().toISOString() }
    events.push(ev)
    write(EVENTS_KEY, events)
    return ev
  },

  // Undo a logged care entry, then re-derive the matching last_* date from the
  // most recent remaining event of that type (or clear it if none are left).
  async deleteCareEvent(event) {
    if (!event?.id) return
    const remaining = read(EVENTS_KEY).filter((e) => e.id !== event.id)
    write(EVENTS_KEY, remaining)
    const field = { watered: 'lastWatered', repotted: 'lastRepotted', fertilized: 'lastFertilized' }[event.type]
    if (field) {
      const latest =
        remaining
          .filter((e) => e.plantId === event.plantId && e.type === event.type)
          .map((e) => e.eventDate)
          .sort()
          .pop() || null
      await this.updatePlant(event.plantId, { [field]: latest })
    }
  },
}

function stripPhotoFile(data) {
  const { photoFile, ...rest } = data
  return rest
}
