// Small status pill for a care task (e.g. watering).
const STYLES = {
  overdue: 'bg-rose-500/20 text-rose-300',
  due: 'bg-amber-500/20 text-amber-300',
  soon: 'bg-sky-500/15 text-sky-300',
  ok: 'bg-canopy-500/15 text-canopy-400',
}
const LABELS = {
  overdue: 'Overdue',
  due: 'Water today',
  soon: 'Due soon',
  ok: 'Healthy',
}

export default function CareBadge({ status, label, className = '' }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]} ${className}`}>
      {label || LABELS[status]}
    </span>
  )
}
