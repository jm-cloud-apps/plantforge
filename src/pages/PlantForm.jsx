import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { db } from '../lib/db.js'
import { presetFor } from '../data/plantTypes.js'
import { today } from '../lib/care.js'
import TypeCombobox from '../components/TypeCombobox.jsx'
import PhotoInput from '../components/PhotoInput.jsx'

const BLANK = {
  name: '', type: '', location: '', light: '', potSize: '', acquiredOn: '',
  lastWatered: '', waterIntervalDays: '', lastRepotted: '', repotIntervalDays: '',
  lastFertilized: '', fertilizeIntervalDays: '', notes: '',
}

export default function PlantForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(BLANK)
  const [photoFile, setPhotoFile] = useState(undefined) // undefined = unchanged
  const [existingPhoto, setExistingPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    db.getPlant(id).then((p) => {
      if (!p) return setError('Plant not found')
      setExistingPhoto(p.photoUrl)
      setForm({
        name: p.name || '', type: p.type || '', location: p.location || '', light: p.light || '',
        potSize: p.potSize || '', acquiredOn: p.acquiredOn || '', lastWatered: p.lastWatered || '',
        waterIntervalDays: p.waterIntervalDays ?? '', lastRepotted: p.lastRepotted || '',
        repotIntervalDays: p.repotIntervalDays ?? '', lastFertilized: p.lastFertilized || '',
        fertilizeIntervalDays: p.fertilizeIntervalDays ?? '', notes: p.notes || '',
      })
    })
  }, [id, editing])

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  // When a known type is chosen, gently prefill watering interval + light if blank.
  function handleType(val) {
    setForm((f) => {
      const next = { ...f, type: val }
      const preset = presetFor(val)
      if (preset) {
        if (!f.waterIntervalDays) next.waterIntervalDays = String(preset.water)
        if (!f.light) next.light = preset.light
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Please give your plant a name.')
    setBusy(true)
    setError('')
    try {
      const data = { ...form, name: form.name.trim() }
      if (photoFile !== undefined) data.photoFile = photoFile // File or null (remove)
      const saved = editing ? await db.updatePlant(id, data) : await db.createPlant(data)
      navigate(`/plant/${saved.id}`)
    } catch (err) {
      setError(err?.message || 'Save failed.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-rise space-y-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{editing ? 'Edit plant' : 'Add a plant'}</h1>
        <Link to={editing ? `/plant/${id}` : '/'} className="text-sm text-soil-50/55">Cancel</Link>
      </div>

      <PhotoInput value={existingPhoto} onChange={setPhotoFile} />

      <div>
        <label className="label" htmlFor="name">Name *</label>
        <input id="name" className="field" value={form.name} onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Monty, Kitchen Monstera" autoCapitalize="words" required />
      </div>

      <div>
        <label className="label" htmlFor="plant-type">Type of plant</label>
        <TypeCombobox value={form.type} onChange={handleType} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="location">Room / location</label>
          <input id="location" className="field" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Living room" />
        </div>
        <div>
          <label className="label" htmlFor="light">Light</label>
          <select id="light" className="field" value={form.light} onChange={(e) => set('light', e.target.value)}>
            <option value="">—</option>
            <option value="low">Low light</option>
            <option value="medium">Medium light</option>
            <option value="bright">Bright light</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="potSize">Pot size</label>
          <input id="potSize" className="field" value={form.potSize} onChange={(e) => set('potSize', e.target.value)} placeholder='6"' />
        </div>
        <div>
          <label className="label" htmlFor="acquiredOn">Acquired / purchased</label>
          <input id="acquiredOn" type="date" className="field" value={form.acquiredOn} max={today()} onChange={(e) => set('acquiredOn', e.target.value)} />
        </div>
      </div>

      <CareFields title="💧 Watering" lastKey="lastWatered" intKey="waterIntervalDays" form={form} set={set} />
      <CareFields title="🪴 Repotting" lastKey="lastRepotted" intKey="repotIntervalDays" form={form} set={set} />
      <CareFields title="🌿 Fertilizing" lastKey="lastFertilized" intKey="fertilizeIntervalDays" form={form} set={set} />

      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} className="field" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything to remember…" />
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Add plant'}
      </button>
    </form>
  )
}

function CareFields({ title, lastKey, intKey, form, set }) {
  return (
    <div className="card p-4">
      <div className="mb-2 font-semibold text-white">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={lastKey}>Last done</label>
          <input id={lastKey} type="date" className="field" value={form[lastKey]} max={today()} onChange={(e) => set(lastKey, e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={intKey}>Every (days)</label>
          <input id={intKey} type="number" inputMode="numeric" min="1" className="field" value={form[intKey]} onChange={(e) => set(intKey, e.target.value)} placeholder="e.g. 7" />
        </div>
      </div>
    </div>
  )
}
