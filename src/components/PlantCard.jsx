import { useState } from 'react'
import { Link } from 'react-router-dom'
import CareBadge from './CareBadge.jsx'
import PlantTypeIcon from './PlantTypeIcon.jsx'
import { db } from '../lib/db.js'
import { careSummary } from '../lib/care.js'
import { careType as resolveCareType } from '../data/careTypes.js'

// One row in a plant list. Alongside the status badge it shows a compact,
// glanceable timing line — always "<verb> Nd ago" plus how urgent it is now
// (e.g. "3d overdue" / "next in 4d") — so you never have to open the plant to
// know when it was last cared for. `careType` picks which task the row reflects
// (watering by default); a one-tap button logs "<verb> today" for plants that
// need it (pass `onChanged` to refresh the surrounding list).
export default function PlantCard({ plant, onChanged, careType = 'watered' }) {
  const [busy, setBusy] = useState(false)
  const care = resolveCareType(careType)
  const last = plant[care.lastKey]
  const interval = plant[care.intervalKey]
  const { status, lastAgo, dueIn } = careSummary(last, interval)
  const needsNow = status === 'overdue' || status === 'due'
  const neverDone = Boolean(interval) && !last
  const verb = care.verb.toLowerCase()

  // "<verb> today" / "<verb> 8d ago" — the fact the user always wants first.
  const lastLabel = lastAgo == null ? null : lastAgo === 0 ? `${verb} today` : `${verb} ${lastAgo}d ago`
  // Urgency magnitude, skipped when the badge already says it (due today).
  let dueLabel = null
  if (dueIn != null && dueIn !== 0) {
    dueLabel = dueIn < 0 ? `${-dueIn}d overdue` : `${status === 'ok' ? 'next' : 'due'} in ${dueIn}d`
  }
  const timing = [lastLabel, dueLabel].filter(Boolean).join(' · ')

  async function logNow(e) {
    e.preventDefault() // the whole card is a <Link>; don't navigate
    if (busy) return
    setBusy(true)
    try {
      await db.logCare(plant.id, care.key)
      onChanged?.()
    } catch (err) {
      alert(err.message || 'Could not save — please try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Link to={`/plant/${plant.id}`} className="card animate-pop flex items-center gap-3 p-3 active:scale-[0.99]">
      <Thumb plant={plant} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white">{plant.name}</div>
        <div className="truncate text-sm text-soil-50/55">
          {plant.type || 'Unknown type'}
          {plant.location && <span className="text-soil-50/40"> · {plant.location}</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {status && <CareBadge status={status} label={status === 'due' ? care.dueLabel : undefined} />}
          {timing ? (
            <span className="text-xs text-soil-50/55">{timing}</span>
          ) : (
            !status && (
              <span className="text-xs text-soil-50/40">
                {neverDone ? `Not ${verb} yet` : `No ${care.label.toLowerCase()} schedule`}
              </span>
            )
          )}
        </div>
      </div>
      {needsNow || neverDone ? (
        <button
          onClick={logNow}
          disabled={busy}
          aria-label={`Mark ${plant.name} ${verb} today`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-lg transition active:scale-90 disabled:opacity-50"
        >
          {busy ? '…' : care.icon}
        </button>
      ) : (
        <span className="text-soil-50/30">›</span>
      )}
    </Link>
  )
}

export function Thumb({ plant, size = 'h-16 w-16' }) {
  return plant.photoUrl ? (
    <img src={plant.photoUrl} alt={plant.name} className={`${size} shrink-0 rounded-xl object-cover`} loading="lazy" />
  ) : (
    <div className={`${size} grid shrink-0 place-items-center rounded-xl bg-soil-800`}>
      <PlantTypeIcon type={plant.type} className="h-3/5 w-3/5 text-canopy-400" />
    </div>
  )
}
