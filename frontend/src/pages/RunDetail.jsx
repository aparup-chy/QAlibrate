import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X, ShieldAlert, SkipForward } from 'lucide-react'
import client from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'
import PriorityTag from '../components/PriorityTag'

const ACTIONS = [
  { status: 'passed', label: 'Pass', icon: Check, active: 'bg-pass text-white border-pass', idle: 'border-line text-ink-muted hover:border-pass hover:text-pass' },
  { status: 'failed', label: 'Fail', icon: X, active: 'bg-fail text-white border-fail', idle: 'border-line text-ink-muted hover:border-fail hover:text-fail' },
  { status: 'blocked', label: 'Blocked', icon: ShieldAlert, active: 'bg-blocked text-white border-blocked', idle: 'border-line text-ink-muted hover:border-blocked hover:text-blocked' },
  { status: 'skipped', label: 'Skip', icon: SkipForward, active: 'bg-pending text-white border-pending', idle: 'border-line text-ink-muted hover:border-pending hover:text-pending' },
]

function RunItemRow({ item, onUpdate }) {
  const [notes, setNotes] = useState(item.notes || '')
  const [flash, setFlash] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function setStatus(status) {
    await onUpdate(item.id, { status, notes })
    setFlash(true)
    setTimeout(() => setFlash(false), 500)
  }

  async function saveNotes() {
    if (notes !== item.notes) {
      await onUpdate(item.id, { status: item.status, notes })
    }
  }

  return (
    <div className={`border-b border-line px-5 py-4 transition-colors last:border-b-0 ${flash ? 'bg-signal-soft' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-ink-muted">{item.test_case_code}</span>
            <PriorityTag priority={item.priority} />
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-left text-sm font-semibold text-ink hover:text-signal"
          >
            {item.test_case_title}
          </button>
        </div>

        <div className="flex flex-shrink-0 gap-1.5">
          {ACTIONS.map(({ status, label, icon: Icon, active, idle }) => (
            <button
              key={status}
              onClick={() => setStatus(status)}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                item.status === status ? active : idle
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          <label className="field-label">Notes</label>
          <textarea
            className="field-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add context for this result…"
          />
        </div>
      )}
    </div>
  )
}

export default function RunDetail() {
  const { runId } = useParams()
  const { selectionVersion } = useWorkspace()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await client.get(`/test-runs/${runId}`)
    setRun(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, selectionVersion])

  async function handleUpdate(itemId, payload) {
    await client.patch(`/test-runs/${runId}/items/${itemId}`, payload)
    await load()
  }

  if (loading || !run) {
    return <p className="text-sm text-ink-muted">Loading test run…</p>
  }

  const total = run.items.length
  const executed = run.items.filter((i) => i.status !== 'pending').length

  return (
    <div>
      <Link to="/test-runs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> All test runs
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{run.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {executed} of {total} executed · Started {new Date(run.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`rounded px-2.5 py-1 text-xs font-semibold ${
            run.status === 'completed' ? 'bg-pass-soft text-pass' : 'bg-signal-soft text-signal'
          }`}
        >
          {run.status === 'completed' ? 'Completed' : 'In progress'}
        </span>
      </div>

      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-signal transition-all"
          style={{ width: total ? `${(executed / total) * 100}%` : '0%' }}
        />
      </div>

      <div className="card">
        {run.items.map((item) => (
          <RunItemRow key={item.id} item={item} onUpdate={handleUpdate} />
        ))}
      </div>
    </div>
  )
}
