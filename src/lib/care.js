// Care scheduling + date helpers (native Date, no dependencies).
//
// Care dates are timezone-independent CALENDAR dates ("YYYY-MM-DD"), not instants.
// We always read and format them in the device's LOCAL timezone (PST on her
// phone). Plain `new Date("2026-06-20")` parses as UTC midnight, which renders and
// computes as the *previous* day in negative-offset zones (PST) — the classic
// off-by-one. The helpers below stay on local Y/M/D components to avoid that.

const DAY = 86400000

// Parse a "YYYY-MM-DD" (or full ISO datetime) value into a LOCAL Date. Date-only
// strings are rebuilt from local components so they never shift across timezones.
function toLocalDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return value
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(value) // full ISO datetime (e.g. an event's createdAt)
}

// A Date → local "YYYY-MM-DD" (no UTC conversion).
function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d) {
  const x = toLocalDate(d)
  if (!x) return null
  x.setHours(0, 0, 0, 0)
  return x
}

// Today's LOCAL calendar date as "YYYY-MM-DD" (device timezone).
export function today() {
  return toISODate(new Date())
}

// Whole days between two dates (b - a). Positive = b is later.
export function daysBetween(a, b) {
  const da = startOfDay(a)
  const dbb = startOfDay(b)
  if (!da || !dbb) return null
  return Math.round((dbb - da) / DAY)
}

export function daysAgo(dateStr) {
  if (!dateStr) return null
  return daysBetween(dateStr, today())
}

// Next due date (local "YYYY-MM-DD") given a last-done date and interval in days.
export function nextDue(lastDate, intervalDays) {
  if (!lastDate || !intervalDays) return null
  const d = startOfDay(lastDate)
  if (!d) return null
  d.setDate(d.getDate() + Number(intervalDays))
  return toISODate(d)
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
  const d = toLocalDate(dateStr)
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Friendly "X months ago" for photo dates (falls back to days for recent ones).
export function monthsAgoLabel(dateStr) {
  const days = daysAgo(dateStr)
  if (days === null) return ''
  if (days < 31) return relativeDays(dateStr)
  const months = Math.round(days / 30.44)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

// Photo check-in: due when the plant HAS a photo whose latest is 6+ months old.
// Plants with no photo (default icon) are never due — we leave those alone.
const PHOTO_REMINDER_MONTHS = 6
export function photoReminderDue(lastPhotoOn) {
  const due = startOfDay(lastPhotoOn)
  if (!due) return false
  due.setMonth(due.getMonth() + PHOTO_REMINDER_MONTHS)
  return startOfDay(today()) >= due
}

// Glanceable summary of one care task (watering, kelp, repotting…) for a list
// row or detail tile. Bundles the two facts worth showing without opening the
// plant: when it was last done, and how urgent it is now. `dueIn` is signed days
// until the next due date (negative = overdue).
//   status  -> 'overdue' | 'due' | 'soon' | 'ok' | null (no schedule)
//   lastAgo -> whole days since last done, or null if never done
//   dueIn   -> days until next due, or null if no schedule / never done
export function careSummary(lastDate, intervalDays) {
  const status = careStatus(lastDate, intervalDays)
  const lastAgo = daysAgo(lastDate)
  const due = nextDue(lastDate, intervalDays)
  const dueIn = due ? daysBetween(today(), due) : null
  return { status, lastAgo, dueIn }
}

// Does this plant need watering now (due or overdue)?
export function needsWater(plant) {
  const s = careStatus(plant.lastWatered, plant.waterIntervalDays)
  return s === 'due' || s === 'overdue'
}

export function wateringSoon(plant) {
  return careStatus(plant.lastWatered, plant.waterIntervalDays) === 'soon'
}
