// Local-only data backend (no Supabase). Stores everything in localStorage,
// including photos as base64 data URLs. Used when Supabase isn't configured so
// the app is fully usable for local/demo use and development.

import { today } from './care.js'

const PLANTS_KEY = 'plantforge.plants.v1'
const EVENTS_KEY = 'plantforge.events.v1'
const SETTINGS_KEY = 'plantforge.settings.v1'
const PHOTOS_KEY = 'plantforge.photos.v1'

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
      lastPhotoOn: null,
      ...stripPhotoFile(data),
    }
    plants.push(plant)
    write(PLANTS_KEY, plants)
    if (data.photoFile) await this.addPhoto(plant.id, data.photoFile)
    return this.getPlant(plant.id)
  },

  async updatePlant(id, data) {
    const plants = read(PLANTS_KEY)
    const i = plants.findIndex((p) => p.id === id)
    if (i === -1) return null
    plants[i] = { ...plants[i], ...stripPhotoFile(data), updatedAt: new Date().toISOString() }
    write(PLANTS_KEY, plants)
    if (data.photoFile) await this.addPhoto(id, data.photoFile)
    else if (data.photoFile === null) await this.removeCover(id)
    return this.getPlant(id)
  },

  async deletePlant(id) {
    write(PLANTS_KEY, read(PLANTS_KEY).filter((p) => p.id !== id))
    write(EVENTS_KEY, read(EVENTS_KEY).filter((e) => e.plantId !== id))
    write(PHOTOS_KEY, read(PHOTOS_KEY).filter((ph) => ph.plantId !== id))
  },

  async listEvents(plantId) {
    return read(EVENTS_KEY)
      .filter((e) => e.plantId === plantId)
      .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  },

  async logCare(plantId, type, { date, note } = {}) {
    const eventDate = date || today() // local calendar date (device timezone)
    // 1) stamp the matching last_* field on the plant
    const field = { watered: 'lastWatered', kelped: 'lastKelped', repotted: 'lastRepotted', fertilized: 'lastFertilized' }[type]
    if (field) await this.updatePlant(plantId, { [field]: eventDate })
    // 2) append a history event
    const events = read(EVENTS_KEY)
    const ev = { id: uid(), plantId, type, eventDate, note: note || null, createdAt: new Date().toISOString() }
    events.push(ev)
    write(EVENTS_KEY, events)
    return ev
  },

  // ── Photo history (photos stored inline as data URLs) ───────────────────────
  async listPhotos(plantId) {
    return read(PHOTOS_KEY)
      .filter((ph) => ph.plantId === plantId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((ph) => ({ id: ph.id, url: ph.dataUrl, createdAt: ph.createdAt }))
  },

  async addPhoto(plantId, file) {
    const photos = read(PHOTOS_KEY)
    photos.push({ id: uid(), plantId, dataUrl: await fileToDataUrl(file), createdAt: new Date().toISOString() })
    write(PHOTOS_KEY, photos)
    refreshCover(plantId)
  },

  async removePhoto(plantId, photoId) {
    write(PHOTOS_KEY, read(PHOTOS_KEY).filter((ph) => ph.id !== photoId))
    refreshCover(plantId)
  },

  // Remove the current cover (most recent photo); cover reverts to the previous.
  async removeCover(plantId) {
    const latest = mostRecentPhoto(plantId)
    if (latest) return this.removePhoto(plantId, latest.id)
    refreshCover(plantId) // no history → clears cover
  },

  // User preferences (collection name, …). Normalized camelCase, same shape as
  // the cloud backend.
  async getSettings() {
    const s = read(SETTINGS_KEY)
    const obj = Array.isArray(s) ? {} : s
    return { collectionName: obj.collectionName || null }
  },

  async updateSettings(patch) {
    const cur = read(SETTINGS_KEY)
    const next = { ...(Array.isArray(cur) ? {} : cur), ...patch }
    if (!next.collectionName) delete next.collectionName
    write(SETTINGS_KEY, next)
    return { collectionName: next.collectionName || null }
  },

  // Undo a logged care entry, then re-derive the matching last_* date from the
  // most recent remaining event of that type (or clear it if none are left).
  async deleteCareEvent(event) {
    if (!event?.id) return
    const remaining = read(EVENTS_KEY).filter((e) => e.id !== event.id)
    write(EVENTS_KEY, remaining)
    const field = { watered: 'lastWatered', kelped: 'lastKelped', repotted: 'lastRepotted', fertilized: 'lastFertilized' }[event.type]
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

function mostRecentPhoto(plantId) {
  return read(PHOTOS_KEY)
    .filter((ph) => ph.plantId === plantId)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    .pop()
}

// Mirror the plant's cover (photoUrl) + last_photo date onto its newest photo.
function refreshCover(plantId) {
  const latest = mostRecentPhoto(plantId)
  const plants = read(PLANTS_KEY)
  const i = plants.findIndex((p) => p.id === plantId)
  if (i === -1) return
  plants[i] = {
    ...plants[i],
    photoUrl: latest?.dataUrl || null,
    lastPhotoOn: latest?.createdAt ? latest.createdAt.slice(0, 10) : null,
  }
  write(PLANTS_KEY, plants)
}
