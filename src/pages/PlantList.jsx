import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db.js'
import PlantCard from '../components/PlantCard.jsx'

export default function PlantList() {
  const [plants, setPlants] = useState(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    db.listPlants().then(setPlants).catch((e) => setError(e.message || 'Failed to load'))
  }, [])

  const filtered = useMemo(() => {
    if (!plants) return []
    const term = q.trim().toLowerCase()
    if (!term) return plants
    return plants.filter(
      (p) => p.name?.toLowerCase().includes(term) || p.type?.toLowerCase().includes(term) || p.location?.toLowerCase().includes(term),
    )
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
          {filtered.map((p) => <PlantCard key={p.id} plant={p} />)}
        </div>
      )}
    </div>
  )
}
