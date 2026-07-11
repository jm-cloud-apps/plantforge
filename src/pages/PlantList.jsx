import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db.js'
import { careStatus, nextDue } from '../lib/care.js'
import PlantCard from '../components/PlantCard.jsx'

// Most urgent first: overdue → due today → due soon → healthy → never watered →
// no schedule. Within a group, soonest due date first, then name.
const STATUS_RANK = { overdue: 0, due: 1, soon: 2, ok: 3 }
function urgencyRank(p) {
  const s = careStatus(p.lastWatered, p.waterIntervalDays)
  if (s) return STATUS_RANK[s]
  return p.waterIntervalDays ? 4 : 5
}
function byUrgency(a, b) {
  const rank = urgencyRank(a) - urgencyRank(b)
  if (rank) return rank
  const dueA = nextDue(a.lastWatered, a.waterIntervalDays) || ''
  const dueB = nextDue(b.lastWatered, b.waterIntervalDays) || ''
  return dueA.localeCompare(dueB) || (a.name || '').localeCompare(b.name || '')
}

export default function PlantList() {
  const [plants, setPlants] = useState(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    db.listPlants().then(setPlants).catch((e) => setError(e.message || 'Failed to load'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!plants) return []
    const term = q.trim().toLowerCase()
    const matches = term
      ? plants.filter(
          (p) => p.name?.toLowerCase().includes(term) || p.type?.toLowerCase().includes(term) || p.location?.toLowerCase().includes(term),
        )
      : plants
    return [...matches].sort(byUrgency)
  }, [plants, q])

  if (error) return <div className="py-16 text-center text-soil-50/55">⚠️ {error}</div>
  if (!plants) return <div className="py-16 text-center text-soil-50/55">Loading…</div>

  return (
    <div className="animate-rise space-y-4 py-4">
      <h1 className="text-2xl font-bold text-white">All plants</h1>

      {plants.length > 0 && (
        <input
          className="field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, type or room…"
          inputMode="search"
          autoCapitalize="none"
        />
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
          {filtered.map((p) => <PlantCard key={p.id} plant={p} onChanged={load} />)}
        </div>
      )}
    </div>
  )
}
