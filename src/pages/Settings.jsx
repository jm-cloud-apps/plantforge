import { useEffect, useState } from 'react'
import { db, MODE } from '../lib/db.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { BUILD, buildStamp } from '../lib/build.js'

export default function Settings() {
  const { user, needsAuth, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [nameStatus, setNameStatus] = useState('') // '' | 'saving' | 'saved' | 'error'
  const stamp = buildStamp()

  useEffect(() => {
    db.getSettings().then((s) => setName(s.collectionName || '')).catch(() => {})
  }, [])

  async function saveName() {
    setNameStatus('saving')
    try {
      const s = await db.updateSettings({ collectionName: name.trim() })
      setName(s.collectionName || '')
      setNameStatus('saved')
      setTimeout(() => setNameStatus(''), 1500)
    } catch {
      setNameStatus('error')
    }
  }

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

      <section className="card space-y-2 p-4">
        <label className="label" htmlFor="collection-name">Collection name</label>
        <p className="text-sm text-soil-50/55">The title shown on your home screen (default “My Plants”).</p>
        <div className="flex gap-2">
          <input
            id="collection-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Plants"
            maxLength={40}
            autoCapitalize="words"
          />
          <button onClick={saveName} disabled={nameStatus === 'saving'} className="btn-primary shrink-0 px-4">
            {nameStatus === 'saving' ? 'Saving…' : nameStatus === 'saved' ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        {nameStatus === 'error' && (
          <p className="text-sm text-rose-300">Couldn’t save — make sure the settings table is set up.</p>
        )}
      </section>

      <section className="card divide-y divide-white/5">
        <Row label="Storage">
          {MODE === 'cloud' ? (
            <span className="text-canopy-400">☁️ Cloud sync</span>
          ) : (
            <span className="text-amber-300">📱 This device only</span>
          )}
        </Row>
        {needsAuth && (
          <Row label="Signed in as">
            <span className="text-soil-50/80">{(user?.email || '').split('@')[0] || '—'}</span>
          </Row>
        )}
      </section>

      <section className="card p-4">
        <div className="text-sm font-semibold text-white">📲 Add to Home Screen</div>
        <p className="mt-1 text-sm text-soil-50/55">
          In Safari, tap the Share button → <span className="text-soil-50/80">Add to Home Screen</span> to use PlantForge
          like a full-screen app.
        </p>
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

      <div className="pt-2 text-center text-xs text-soil-50/35">
        <p>PlantForge · made with 🌱</p>
        <p className="mt-1 font-mono text-[11px] text-soil-50/25">
          v{BUILD.version} · {stamp.commit}
          {stamp.when ? ` · ${stamp.when}` : ''}
        </p>
      </div>
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
