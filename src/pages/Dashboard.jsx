import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, MODE } from '../lib/db.js'
import { needsWater, wateringSoon, careStatus, photoReminderDue } from '../lib/care.js'
import { DEFAULT_COLLECTION_NAME } from '../lib/settings.js'
import PlantCard from '../components/PlantCard.jsx'

export default function Dashboard() {
  const [plants, setPlants] = useState(null)
  const [error, setError] = useState('')
  const [collectionName, setCollectionName] = useState(DEFAULT_COLLECTION_NAME)

  const load = useCallback(() => {
    db.listPlants().then(setPlants).catch((e) => setError(e.message || 'Failed to load'))
  }, [])

  useEffect(() => {
    load()
    db.getSettings().then((s) => s.collectionName && setCollectionName(s.collectionName)).catch(() => {})
  }, [load])

  const stats = useMemo(() => {
    if (!plants) return null
    const water = plants.filter(needsWater)
    const soon = plants.filter((p) => !needsWater(p) && wateringSoon(p))
    const repotSoon = plants.filter((p) => {
      const s = careStatus(p.lastRepotted, p.repotIntervalDays)
      return s === 'due' || s === 'overdue'
    })
    const photoDue = plants.filter((p) => photoReminderDue(p.lastPhotoOn))
    const recent = [...plants]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 3)
    return { total: plants.length, water, soon, repotSoon, photoDue, recent }
  }, [plants])

  if (error) return <Notice>⚠️ {error}</Notice>
  if (!plants) return <Notice>Loading your plants…</Notice>

  return (
    <div className="animate-rise space-y-5 py-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{collectionName}</h1>
          <p className="text-sm text-soil-50/55">
            {stats.total === 0 ? 'Let’s add your first plant' : `${stats.total} plant${stats.total === 1 ? '' : 's'} in your collection`}
          </p>
        </div>
        {MODE === 'local' && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-300">local mode</span>
        )}
      </header>

      {stats.total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={stats.total} />
            <Stat label="Need water" value={stats.water.length} tone={stats.water.length ? 'warn' : 'ok'} />
            <Stat label="Due soon" value={stats.soon.length} tone="info" />
          </div>

          {/* Needs water */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-soil-50/45">Needs water</h2>
            {stats.water.length === 0 ? (
              <div className="card p-5 text-center text-soil-50/60">🎉 All caught up — nothing needs water today.</div>
            ) : (
              <div className="space-y-2">
                {stats.water.map((p) => <PlantCard key={p.id} plant={p} onChanged={load} />)}
              </div>
            )}
          </section>

          {stats.repotSoon.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-soil-50/45">Repotting due</h2>
              <div className="space-y-2">{stats.repotSoon.map((p) => <PlantCard key={p.id} plant={p} onChanged={load} />)}</div>
            </section>
          )}

          {stats.photoDue.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-soil-50/45">📸 Photo check-in</h2>
              <p className="text-xs text-soil-50/45">No new photo in 6 months — snap an updated one.</p>
              <div className="space-y-2">{stats.photoDue.map((p) => <PlantCard key={p.id} plant={p} onChanged={load} />)}</div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-soil-50/45">Recently added</h2>
              <Link to="/plants" className="text-sm text-canopy-400">See all</Link>
            </div>
            <div className="space-y-2">{stats.recent.map((p) => <PlantCard key={p.id} plant={p} onChanged={load} />)}</div>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone }) {
  const color =
    tone === 'warn' ? 'text-amber-300' : tone === 'info' ? 'text-sky-300' : tone === 'ok' ? 'text-canopy-400' : 'text-white'
  return (
    <div className="card p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-soil-50/55">{label}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card animate-pop p-8 text-center">
      <div className="text-5xl">🌱</div>
      <h2 className="mt-3 text-lg font-semibold text-white">No plants yet</h2>
      <p className="mt-1 text-soil-50/60">Add your first plant to start tracking watering, repotting and more.</p>
      <Link to="/plants/new" className="btn-primary mt-5 inline-flex px-6">+ Add a plant</Link>
    </div>
  )
}

function Notice({ children }) {
  return <div className="py-16 text-center text-soil-50/55">{children}</div>
}
