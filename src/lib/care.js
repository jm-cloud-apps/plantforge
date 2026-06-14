// Care scheduling + date helpers (native Date, no dependencies).

const DAY = 86400000

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

// Whole days between two ISO dates (b - a). Positive = b is later.
export function daysBetween(a, b) {
  if (!a || !b) return null
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY)
}

export function daysAgo(dateStr) {
  if (!dateStr) return null
  return daysBetween(dateStr, today())
}

// Next due date (ISO) given a last-done date and interval in days.
export function nextDue(lastDate, intervalDays) {
  if (!lastDate || !intervalDays) return null
  const d = startOfDay(lastDate)
  d.setDate(d.getDate() + Number(intervalDays))
  return d.toISOString().slice(0, 10)
}

// Status for a care task: needs an interval to be meaningful.
//  -> 'overdue' | 'due' (today) | 'soon' (<=2 days) | 'ok' | null (no schedule)
export function careStatus(lastDate, intervalDays) {
  const due = nextDue(lastDate, intervalDays)
  if (!due) return null
  const diff = daysBetween(today(), due) // days until due (negative = overdue)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'due'
  if (diff <= 2) return 'soon'
  return 'ok'
}

// Human label like "today", "in 3 days", "2 days ago".
export function relativeDays(dateStr) {
  const n = daysBetween(today(), dateStr)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${Math.abs(n)} days ago`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Does this plant need watering now (due or overdue)?
export function needsWater(plant) {
  const s = careStatus(plant.lastWatered, plant.waterIntervalDays)
  return s === 'due' || s === 'overdue'
}

export function wateringSoon(plant) {
  return careStatus(plant.lastWatered, plant.waterIntervalDays) === 'soon'
}
