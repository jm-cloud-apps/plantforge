import { useRef, useState } from 'react'
import PlantTypeIcon from './PlantTypeIcon.jsx'

// Photo picker for a plant. Tapping the thumbnail OR the button opens the native
// iOS sheet (Photo Library / Take Photo / Choose File) — note: no `capture`
// attribute, otherwise iOS jumps straight to the camera and hides the library.
// Calls onChange(File|null) and shows a live preview.
export default function PhotoInput({ value, onChange, type }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(value || null)

  const openPicker = () => inputRef.current?.click()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onChange(file)
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={openPicker}
        aria-label={preview ? 'Change photo' : 'Add photo'}
        className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-soil-800 active:scale-95"
      >
        {preview ? (
          <img src={preview} alt="Plant preview" className="h-full w-full object-cover" />
        ) : (
          <PlantTypeIcon type={type} className="h-3/5 w-3/5 text-canopy-400" />
        )}
        <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-soil-900/85 text-xs">📷</span>
      </button>

      <div className="space-y-1">
        <button type="button" className="btn-ghost px-4" onClick={openPicker}>
          📷 {preview ? 'Change photo' : 'Add photo'}
        </button>
        <p className="text-xs text-soil-50/45">Take a photo or choose from your library.</p>
        {preview && (
          <button
            type="button"
            className="block text-sm text-soil-50/50 hover:text-rose-300"
            onClick={() => {
              setPreview(null)
              onChange(null)
            }}
          >
            Remove
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
