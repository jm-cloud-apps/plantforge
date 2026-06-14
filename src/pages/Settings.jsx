import { useState } from 'react'
import { db, MODE } from '../lib/db.js'
import { useAuth } from '../auth/AuthProvider.jsx'

export default function Settings() {
  const { user, needsAuth, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  async function exportBackup() {
    setBusy(true)
    try {
      const plants = await db.listPlants()
      const withEvents = await Promise.all(
        plants.map(async (p) => ({ ...p, events: await db.listEvents(p.id) })),
      )
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), plants: withEvents }, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plantforge-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-rise space-y-5 py-4">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <section className="card divide-y divide-white/5">
        <Row label="Storage">
          {MODE === 'cloud' ? (
            <span className="text-canopy-400">☁️ Cloud sync</span>
          ) : (
            <span className="text-amber-300">📱 This device only</span>
          )}
        </Row>
        {needsAuth && (
          <Row label="Account">
            <span className="text-soil-50/80">{user?.email}</span>
          </Row>
        )}
      </section>

      {MODE === 'local' && (
        <p className="text-sm text-soil-50/55">
          You’re in local mode — plant data lives only in this browser. Connect Supabase (see the README) for cloud
          sync across devices, then back this data up via Export below.
        </p>
      )}

      <section className="space-y-3">
        <button onClick={exportBackup} disabled={busy} className="btn-ghost w-full">
          {busy ? 'Preparing…' : '⬇️ Export backup (JSON)'}
        </button>

        {needsAuth && (
          <button onClick={() => signOut()} className="btn w-full bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
            Sign out
          </button>
        )}
      </section>

      <p className="text-center text-xs text-soil-50/35">PlantForge · made with 🌱</p>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between p-3">
      <span className="text-soil-50/55">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}
