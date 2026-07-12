import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { db } from '../lib/db.js'
import { relativeDays, formatDate, monthsAgoLabel, photoReminderDue, careSummary } from '../lib/care.js'
import { LIGHT_LABEL } from '../data/plantTypes.js'
import { CARE_TYPES } from '../data/careTypes.js'
import CareBadge from '../components/CareBadge.jsx'
import { Thumb } from '../components/PlantCard.jsx'

const EVENT_META = {
  watered: { icon: '💧', label: 'Watered' },
  kelped: { icon: '🌊', label: 'Kelped' },
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
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const [p, ev, ph] = await Promise.all([db.getPlant(id), db.listEvents(id), db.listPhotos(id)])
      setPlant(p)
      setEvents(ev)
      setPhotos(ph)
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

  async function onPickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file) return
    setBusy('addphoto')
    try {
      await db.addPhoto(id, file)
      await load()
    } catch (err) {
      setError(err.message || 'Could not add photo')
    } finally {
      setBusy('')
    }
  }

  async function removePhoto(photo) {
    if (!confirm(`Remove this photo from ${formatDate(photo.createdAt)}?`)) return
    setBusy('photo:' + photo.id)
    try {
      await db.removePhoto(id, photo.id)
      await load()
    } catch (err) {
      setError(err.message || 'Could not remove photo')
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

      {/* Care tasks — 2×2 grid of quick-status tiles with one-tap logging.
          Exact dates live in Care history further down. */}
      <section className="grid grid-cols-2 gap-3">
        {CARE_TYPES.map((c) => (
          <CareTile
            key={c.key}
            care={c}
            last={plant[c.lastKey]}
            interval={plant[c.intervalKey]}
            busy={busy === c.key}
            onAction={() => quickLog(c.key)}
          />
        ))}
      </section>

      {/* Facts */}
      <section className="card divide-y divide-white/5">
        <Fact label="Acquired / purchased" value={plant.acquiredOn ? `${formatDate(plant.acquiredOn)} (${relativeDays(plant.acquiredOn)})` : '—'} />
        {plant.notes && <Fact label="Notes" value={plant.notes} />}
      </section>

      {/* Photos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-soil-50/45">Photos</h2>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy === 'addphoto'}
            className="text-sm font-medium text-canopy-400 disabled:opacity-50"
          >
            {busy === 'addphoto' ? 'Uploading…' : '+ Add photo'}
          </button>
        </div>

        {photoReminderDue(plant.lastPhotoOn) && (
          <div className="card flex items-center gap-3 border border-amber-500/30 bg-amber-500/10 p-3">
            <span className="text-xl">📸</span>
            <p className="flex-1 text-sm text-amber-200/90">
              Time for a new photo — the last one was {monthsAgoLabel(plant.lastPhotoOn)}.
            </p>
            <button onClick={() => fileRef.current?.click()} disabled={busy === 'addphoto'} className="btn-primary px-3 py-1.5 text-sm">
              Add
            </button>
          </div>
        )}

        {photos.length === 0 ? (
          <p className="text-sm text-soil-50/45">No photos yet — add one to start a photo history.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((ph) => (
              <figure key={ph.id} className="relative overflow-hidden rounded-xl bg-soil-800">
                <img
                  src={ph.url}
                  alt={`${plant.name} on ${formatDate(ph.createdAt)}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-soil-900/75 px-1.5 py-1 text-center text-[11px] text-soil-50/85">
                  {formatDate(ph.createdAt)}
                </figcaption>
                <button
                  onClick={() => removePhoto(ph)}
                  disabled={busy === 'photo:' + ph.id}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-soil-900/80 text-soil-50/80 hover:bg-rose-500/80 hover:text-white disabled:opacity-50"
                >
                  {busy === 'photo:' + ph.id ? '…' : '✕'}
                </button>
              </figure>
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
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

// Compact care tile for the 2×2 grid: status badge, a glanceable "<verb> Nd ago"
// line, and a one-tap "<verb> today" button. Every tile uses the same fixed-
// height rows and gaps so all four line up cleanly; exact dates live in the Care
// history list below. Single-line detail (no "· 9d overdue" magnitude) keeps the
// rhythm uniform and matches the list cards.
function CareTile({ care, last, interval, onAction, busy }) {
  const { status, lastAgo } = careSummary(last, interval)
  const neverDone = Boolean(interval) && !last
  const verb = care.verb.toLowerCase()
  const doneLabel = lastAgo == null ? '' : lastAgo === 0 ? `${verb} today` : `${verb} ${lastAgo}d ago`
  return (
    <div className="card flex flex-col gap-3 p-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{care.icon}</span>
          <span className="truncate text-sm font-semibold text-white">{care.label}</span>
        </div>
        <div className="flex h-6 items-center">
          {status ? (
            <CareBadge status={status} label={status === 'due' ? care.dueLabel : undefined} />
          ) : (
            <span className="text-xs font-medium text-soil-50/40">{neverDone ? `Not ${verb} yet` : 'No schedule'}</span>
          )}
        </div>
        <div className="h-4 truncate text-xs text-soil-50/55">{doneLabel}</div>
      </div>
      <button onClick={onAction} disabled={busy} className="btn-primary w-full whitespace-nowrap px-2 text-sm">
        {busy ? 'Saving…' : `${care.verb} today`}
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
