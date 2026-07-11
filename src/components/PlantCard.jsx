import { useState } from 'react'
import { Link } from 'react-router-dom'
import CareBadge from './CareBadge.jsx'
import PlantTypeIcon from './PlantTypeIcon.jsx'
import { db } from '../lib/db.js'
import { careStatus, relativeDays, nextDue } from '../lib/care.js'

// One row in a plant list. Alongside the status badge it shows the most useful
// date without opening the plant: last watered when water is due/overdue, next
// watering otherwise. A one-tap 💧 button logs "watered today" for plants that
// need it (pass `onChanged` to refresh the surrounding list).
export default function PlantCard({ plant, onChanged }) {
  const [busy, setBusy] = useState(false)
  const waterStatus = careStatus(plant.lastWatered, plant.waterIntervalDays)
  const due = nextDue(plant.lastWatered, plant.waterIntervalDays)
  const needsWaterNow = waterStatus === 'overdue' || waterStatus === 'due'
  const neverWatered = Boolean(plant.waterIntervalDays) && !plant.lastWatered

  async function waterNow(e) {
    e.preventDefault() // the whole card is a <Link>; don't navigate
    if (busy) return
    setBusy(true)
    try {
      await db.logCare(plant.id, 'watered')
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
        <div className="truncate text-sm text-soil-50/55">{plant.type || 'Unknown type'}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {waterStatus ? (
            <CareBadge status={waterStatus} />
          ) : (
            <span className="text-xs text-soil-50/40">{neverWatered ? 'Not watered yet' : 'No watering schedule'}</span>
          )}
          {needsWaterNow && (
            <span className="whitespace-nowrap text-xs text-soil-50/45">watered {relativeDays(plant.lastWatered)}</span>
          )}
          {due && !needsWaterNow && (
            <span className="whitespace-nowrap text-xs text-soil-50/45">water {relativeDays(due)}</span>
          )}
        </div>
      </div>
      {needsWaterNow || neverWatered ? (
        <button
          onClick={waterNow}
          disabled={busy}
          aria-label={`Mark ${plant.name} watered today`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-lg transition active:scale-90 disabled:opacity-50"
        >
          {busy ? '…' : '💧'}
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
