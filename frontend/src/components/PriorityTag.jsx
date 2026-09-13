const DOT = {
  low: 'bg-pending',
  medium: 'bg-signal',
  high: 'bg-blocked',
  critical: 'bg-fail',
}

export default function PriorityTag({ priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[priority] || DOT.medium}`} />
      <span className="capitalize">{priority}</span>
    </span>
  )
}
