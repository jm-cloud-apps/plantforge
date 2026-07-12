import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db.js'
import { careStatus, nextDue } from '../lib/care.js'
import { CARE_TYPES, careType as resolveCareType } from '../data/careTypes.js'
import PlantCard from '../components/PlantCard.jsx'

// Most urgent first: overdue → due today → due soon → healthy → never done →
// no schedule. Within a group, soonest due date first, then name. Keyed to the
// selected care lens (watering, kelp, repotting…) — all computed from the
// already-loaded list data, so switching lenses does no extra fetching.
const STATUS_RANK = { overdue: 0, due: 1, soon: 2, ok: 3 }
function urgencyRank(p, care) {
  const s = careStatus(p[care.lastKey], p[care.intervalKey])
  if (s) return STATUS_RANK[s]
  return p[care.intervalKey] ? 4 : 5
}

export default function PlantList() {
  const [plants, setPlants] = useState(null)
  const [q, setQ] = useState('')
  const [lens, setLens] = useState('watered')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    db.listPlants().then(setPlants).catch((e) => setError(e.message || 'Failed to load'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const care = resolveCareType(lens)
  const filtered = useMemo(() => {
    if (!plants) return []
    const term = q.trim().toLowerCase()
    const matches = term
      ? plants.filter(
          (p) => p.name?.toLowerCase().includes(term) || p.type?.toLowerCase().includes(term) || p.location?.toLowerCase().includes(term),
        )
      : plants
    // Precompute each plant's sort key once (not inside the comparator) so
    // re-sorting on a lens switch stays cheap even with a long list.
    return matches
      .map((p) => ({
        p,
        rank: urgencyRank(p, care),
        due: nextDue(p[care.lastKey], p[care.intervalKey]) || '',
        name: (p.name || '').toLowerCase(),
      }))
      .sort((a, b) => a.rank - b.rank || a.due.localeCompare(b.due) || a.name.localeCompare(b.name))
      .map((x) => x.p)
  }, [plants, q, care])

  if (error) return <div className="py-16 text-center text-soil-50/55">⚠️ {error}</div>
  if (!plants) return <div className="py-16 text-center text-soil-50/55">Loading…</div>

  return (
    <div className="animate-rise space-y-4 py-4">
      <h1 className="text-2xl font-bold text-white">All plants</h1>

      {plants.length > 0 && (
        <>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, type or room…"
            inputMode="search"
            autoCapitalize="none"
          />
          {/* Care lens: pick which task each card reflects (status + one-tap
              action) and sorts by. Defaults to watering; Clear returns there. */}
          <div className="flex items-center gap-2">
            <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
              {CARE_TYPES.map((c) => {
                const active = lens === c.key
                return (
                  <button
                    key={c.key}
                    onClick={() => setLens(c.key)}
                    aria-pressed={active}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active ? 'bg-canopy-600 text-white' : 'bg-white/5 text-soil-50/60 active:bg-white/10'
                    }`}
                  >
                    <span>{c.icon}</span>
                    {c.short}
                  </button>
                )
              })}
            </div>
            {lens !== 'watered' && (
              <button
                type="button"
                onClick={() => setLens('watered')}
                aria-label="Clear filter, back to watering"
                className="shrink-0 self-stretch border-l border-white/10 pl-3 text-xs font-medium text-soil-50/55 transition active:text-soil-50/90"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}

      {plants.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl">🌱</div>
          <p className="mt-2 text-soil-50/60">No plants yet.</p>
          <Link to="/plants/new" className="btn-primary mt-4 inline-flex px-6">+ Add a plant</Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-soil-50/50">No matches for “{q}”.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => <PlantCard key={p.id} plant={p} careType={lens} onChanged={load} />)}
        </div>
      )}
    </div>
  )
}
