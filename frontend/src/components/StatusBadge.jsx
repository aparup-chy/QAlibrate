const STYLES = {
  passed: 'bg-pass-soft text-pass',
  failed: 'bg-fail-soft text-fail',
  blocked: 'bg-blocked-soft text-blocked',
  skipped: 'bg-pending-soft text-pending',
  pending: 'bg-pending-soft text-pending',
}

const LABELS = {
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
  pending: 'Pending',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${STYLES[status] || STYLES.pending}`}
    >
      {LABELS[status] || status}
    </span>
  )
}
