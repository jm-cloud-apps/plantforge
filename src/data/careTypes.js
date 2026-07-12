// The care activities tracked per plant, in the order they appear everywhere
// (detail grid, add/edit form, and the All-Plants care filter). Each entry maps
// the UI (camelCase) fields it reads/writes and carries display meta.
//
// To add a care type: add an entry here AND its two columns in *both* backends
// (localBackend.js, supabaseBackend.js) and supabase/schema.sql. `key` doubles
// as the care_events `type` value.
export const CARE_TYPES = [
  { key: 'watered',    label: 'Watering',    short: 'Water', verb: 'Watered',    dueLabel: 'Water today', icon: '💧', lastKey: 'lastWatered',    intervalKey: 'waterIntervalDays' },
  { key: 'kelped',     label: 'Kelp',        short: 'Kelp',  verb: 'Kelped',     dueLabel: 'Kelp today',  icon: '🌊', lastKey: 'lastKelped',     intervalKey: 'kelpIntervalDays' },
  { key: 'repotted',   label: 'Repotting',   short: 'Repot', verb: 'Repotted',   dueLabel: 'Repot today', icon: '🪴', lastKey: 'lastRepotted',   intervalKey: 'repotIntervalDays' },
  { key: 'fertilized', label: 'Fertilizing', short: 'Feed',  verb: 'Fertilized', dueLabel: 'Feed today',  icon: '🌿', lastKey: 'lastFertilized', intervalKey: 'fertilizeIntervalDays' },
]

export const careType = (key) => CARE_TYPES.find((c) => c.key === key) || CARE_TYPES[0]
