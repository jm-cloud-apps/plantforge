import { useRef, useState } from 'react'

// Photo picker for a plant. On iOS this offers Camera / Photo Library.
// Calls onChange(File) when a new image is chosen; shows a live preview.
export default function PhotoInput({ value, onChange }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(value || null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onChange(file)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-soil-800">
        {preview ? (
          <img src={preview} alt="Plant preview" className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">🪴</span>
        )}
      </div>
      <div className="space-y-2">
        <button type="button" className="btn-ghost px-4" onClick={() => inputRef.current?.click()}>
          📷 {preview ? 'Change photo' : 'Add photo'}
        </button>
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}
