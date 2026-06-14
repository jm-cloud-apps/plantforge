// Common houseplant types for the autofill combobox. Each may carry rough care
// presets (typical days between watering, light preference) used to *suggest*
// values when a known type is picked — always editable, never forced.
// These are general guidelines, not strict rules; adjust to your home.

export const PLANT_TYPES = [
  { name: 'Monstera', water: 9, light: 'bright' },
  { name: 'Monstera Adansonii', water: 7, light: 'bright' },
  { name: 'Prayer Plant (Maranta)', water: 5, light: 'medium' },
  { name: 'Chinese Money Plant (Pilea)', water: 7, light: 'bright' },
  { name: 'Snake Plant', water: 14, light: 'low' },
  { name: 'Stromanthe Triostar', water: 5, light: 'medium' },
  { name: 'Pothos', water: 9, light: 'medium' },
  { name: 'Golden Pothos', water: 9, light: 'medium' },
  { name: 'Heartleaf Philodendron', water: 9, light: 'medium' },
  { name: 'Philodendron', water: 9, light: 'medium' },
  { name: 'Bird of Paradise', water: 7, light: 'bright' },
  { name: 'Palm', water: 7, light: 'medium' },
  { name: 'Spider Plant', water: 7, light: 'medium' },
  { name: 'Peace Lily', water: 5, light: 'low' },
  { name: 'ZZ Plant', water: 14, light: 'low' },
  { name: 'Fiddle Leaf Fig', water: 7, light: 'bright' },
  { name: 'Rubber Plant', water: 9, light: 'bright' },
  { name: 'Aloe Vera', water: 14, light: 'bright' },
  { name: 'Calathea', water: 5, light: 'medium' },
  { name: 'Anthurium', water: 7, light: 'medium' },
  { name: 'Jade Plant', water: 14, light: 'bright' },
  { name: 'English Ivy', water: 7, light: 'medium' },
  { name: 'Boston Fern', water: 4, light: 'medium' },
  { name: 'Dracaena', water: 10, light: 'medium' },
  { name: 'Croton', water: 7, light: 'bright' },
  { name: 'Orchid', water: 7, light: 'medium' },
  { name: 'Hoya', water: 12, light: 'bright' },
  { name: 'String of Pearls', water: 12, light: 'bright' },
  { name: 'Begonia', water: 6, light: 'medium' },
  { name: 'Succulent', water: 14, light: 'bright' },
  { name: 'Cactus', water: 18, light: 'bright' },
  { name: 'Air Plant', water: 7, light: 'bright' },
]

export const TYPE_NAMES = PLANT_TYPES.map((t) => t.name)

// Look up presets by (case-insensitive) name; returns null for free-text types.
export function presetFor(typeName) {
  if (!typeName) return null
  const t = PLANT_TYPES.find((x) => x.name.toLowerCase() === typeName.trim().toLowerCase())
  return t || null
}

// A simple emoji per light level (for compact mobile chips).
export const LIGHT_LABEL = {
  low: 'Low light',
  medium: 'Medium light',
  bright: 'Bright light',
}
