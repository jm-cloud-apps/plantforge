import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { db } from '../lib/db.js'
import { careStatus, relativeDays, nextDue, formatDate, daysAgo } from '../lib/care.js'
import { LIGHT_LABEL } from '../data/plantTypes.js'
import CareBadge from '../components/CareBadge.jsx'
import { Thumb } from '../components/PlantCard.jsx'

const EVENT_META = {
  watered: { icon: '💧', label: 'Watered' },
  repotted: { icon: '🪴', label: 'Repotted' },
  fertilized: { icon: '🌿', label: 'Fertilized' },
  acquired: { icon: '🛒', label: 'Acquired' },
  note: { icon: '📝', label: 'Note' },
}

export default function PlantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plant, setPlant] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [p, ev] = await Promise.all([db.getPlant(id), db.listEvents(id)])
      setPlant(p)
      setEvents(ev)
    } catch (e) {
      setError(e.message || 'Failed to load')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function quickLog(type) {
    setBusy(type)
    try {
      await db.logCare(id, type)
      await load()
    } catch (e) {
      setError(e.message || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  // Undo an entry logged by mistake (e.g. an accidental "Fertilized today").
  // Removes the history event and resets the matching date to the previous one.
  async function undoEvent(ev) {
    const m = EVENT_META[ev.type] || EVENT_META.note
    if (!confirm(`Remove this “${m.label}” entry (${formatDate(ev.eventDate)})? The ${m.label.toLowerCase()} date will reset to the previous entry, if any.`)) return
    setBusy('undo:' + ev.id)
    try {
      await db.deleteCareEvent(ev)
      await load()
    } catch (e) {
      setError(e.message || 'Could not remove entry')
    } finally {
      setBusy('')
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete “${plant.name}”? This can’t be undone.`)) return
    await db.deletePlant(id)
    navigate('/plants')
  }

  if (error) return <div className="py-16 text-center text-soil-50/55">⚠️ {error}</div>
  if (!plant) return <div className="py-16 text-center text-soil-50/55">Loading…</div>

  return (
    <div className="animate-rise space-y-5 py-4">
      <Link to="/plants" className="text-sm text-soil-50/55">‹ All plants</Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Thumb plant={plant} size="h-24 w-24" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-white">{plant.name}</h1>
          <p className="truncate text-soil-50/60">{plant.type || 'Unknown type'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plant.location && <Chip>📍 {plant.location}</Chip>}
            {plant.light && <Chip>☀️ {LIGHT_LABEL[plant.light] || plant.light}</Chip>}
            {plant.potSize && <Chip>🪴 {plant.potSize}</Chip>}
          </div>
        </div>
      </div>

      {/* Care tasks with quick actions */}
      <section className="space-y-3">
        <CareRow
          icon="💧" title="Watering"
          last={plant.lastWatered} interval={plant.waterIntervalDays}
          actionLabel="Watered today" busy={busy === 'watered'} onAction={() => quickLog('watered')}
        />
        <CareRow
          icon="🪴" title="Repotting"
          last={plant.lastRepotted} interval={plant.repotIntervalDays}
          actionLabel="Repotted today" busy={busy === 'repotted'} onAction={() => quickLog('repotted')}
        />
        <CareRow
          icon="🌿" title="Fertilizing"
          last={plant.lastFertilized} interval={plant.fertilizeIntervalDays}
          actionLabel="Fertilized today" busy={busy === 'fertilized'} onAction={() => quickLog('fertilized')}
        />
      </section>

      {/* Facts */}
      <section className="card divide-y divide-white/5">
        <Fact label="Acquired / purchased" value={plant.acquiredOn ? `${formatDate(plant.acquiredOn)} (${relativeDays(plant.acquiredOn)})` : '—'} />
        {plant.notes && <Fact label="Notes" value={plant.notes} />}
      </section>

      {/* History */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-soil-50/45">Care history</h2>
        {events.length === 0 ? (
          <p className="text-sm text-soil-50/45">No history yet — use the quick actions above.</p>
        ) : (
          <ol className="card divide-y divide-white/5">
            {events.map((e) => {
              const m = EVENT_META[e.type] || EVENT_META.note
              return (
                <li key={e.id} className="flex items-center gap-3 p-3">
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{m.label}</div>
                    {e.note && <div className="text-sm text-soil-50/55">{e.note}</div>}
                  </div>
                  <div className="text-right text-xs text-soil-50/50">
                    <div>{formatDate(e.eventDate)}</div>
                    <div>{relativeDays(e.eventDate)}</div>
                  </div>
                  <button
                    onClick={() => undoEvent(e)}
                    disabled={busy === 'undo:' + e.id}
                    aria-label={`Remove ${m.label} entry`}
                    title="Remove this entry"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-soil-50/40 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                  >
                    {busy === 'undo:' + e.id ? '…' : '✕'}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to={`/plant/${plant.id}/edit`} className="btn-ghost flex-1">Edit</Link>
        <button onClick={handleDelete} className="btn flex-1 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">Delete</button>
      </div>
    </div>
  )
}

function CareRow({ icon, title, last, interval, actionLabel, onAction, busy }) {
  const status = careStatus(last, interval)
  const due = nextDue(last, interval)
  const ago = daysAgo(last)
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white">{title}</span>
        </div>
        {status && <CareBadge status={status} />}
      </div>
      <div className="mt-1 text-sm text-soil-50/60">
        {last ? (
          <>Last: {formatDate(last)} ({ago === 0 ? 'today' : `${ago} day${ago === 1 ? '' : 's'} ago`})</>
        ) : (
          <>Not recorded yet</>
        )}
        {due && <> · next {relativeDays(due)}</>}
        {!interval && last && <> · no interval set</>}
      </div>
      <button onClick={onAction} disabled={busy} className="btn-primary mt-3 w-full">
        {busy ? 'Saving…' : actionLabel}
      </button>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="p-3">
      <div className="text-xs uppercase tracking-wide text-soil-50/40">{label}</div>
      <div className="mt-0.5 whitespace-pre-line text-soil-50/85">{value}</div>
    </div>
  )
}

function Chip({ children }) {
  return <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-soil-50/70">{children}</span>
}
