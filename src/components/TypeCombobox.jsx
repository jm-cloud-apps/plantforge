import { TYPE_NAMES } from '../data/plantTypes.js'

// Free-text input with autofill suggestions from the common-plant list.
// Uses a native <datalist> so it works great with the iOS keyboard and still
// allows any custom value to be typed.
export default function TypeCombobox({ value, onChange, id = 'plant-type' }) {
  return (
    <>
      <input
        id={id}
        list="plant-type-options"
        className="field"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Monstera, Snake Plant…"
        autoComplete="off"
        autoCapitalize="words"
      />
      <datalist id="plant-type-options">
        {TYPE_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  )
}
