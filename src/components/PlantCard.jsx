import { Link } from 'react-router-dom'
import CareBadge from './CareBadge.jsx'
import { careStatus, relativeDays, nextDue } from '../lib/care.js'

export default function PlantCard({ plant }) {
  const waterStatus = careStatus(plant.lastWatered, plant.waterIntervalDays)
  const due = nextDue(plant.lastWatered, plant.waterIntervalDays)
  return (
    <Link to={`/plant/${plant.id}`} className="card animate-pop flex items-center gap-3 p-3 active:scale-[0.99]">
      <Thumb plant={plant} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white">{plant.name}</div>
        <div className="truncate text-sm text-soil-50/55">{plant.type || 'Unknown type'}</div>
        <div className="mt-1.5 flex items-center gap-2">
          {waterStatus ? (
            <CareBadge status={waterStatus} />
          ) : (
            <span className="text-xs text-soil-50/40">No watering schedule</span>
          )}
          {due && (waterStatus === 'ok' || waterStatus === 'soon') && (
            <span className="text-xs text-soil-50/45">water {relativeDays(due)}</span>
          )}
        </div>
      </div>
      <span className="text-soil-50/30">›</span>
    </Link>
  )
}

export function Thumb({ plant, size = 'h-16 w-16' }) {
  return plant.photoUrl ? (
    <img src={plant.photoUrl} alt={plant.name} className={`${size} shrink-0 rounded-xl object-cover`} loading="lazy" />
  ) : (
    <div className={`${size} grid shrink-0 place-items-center rounded-xl bg-soil-800 text-2xl`}>🪴</div>
  )
}
