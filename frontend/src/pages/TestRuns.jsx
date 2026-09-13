import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, PlayCircle, Trash2 } from 'lucide-react'
import client from '../api/client'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

function ProgressBar({ passed, failed, blocked, skipped, total }) {
  if (!total) return <div className="h-1.5 w-full rounded-full bg-line" />
  const pct = (n) => (n / total) * 100
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div style={{ width: `${pct(passed)}%` }} className="bg-pass" />
      <div style={{ width: `${pct(failed)}%` }} className="bg-fail" />
      <div style={{ width: `${pct(blocked)}%` }} className="bg-blocked" />
      <div style={{ width: `${pct(skipped)}%` }} className="bg-pending" />
    </div>
  )
}

export default function TestRuns() {
  const { user } = useAuth()
  const { selectionVersion } = useWorkspace()
  const isAdmin = user?.role === 'admin'
  const [runs, setRuns] = useState([])
  const [suites, setSuites] = useState([])
  const [testCases, setTestCases] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [runName, setRunName] = useState('')
  const [suiteFilter, setSuiteFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [runsRes, suitesRes] = await Promise.all([
      client.get('/test-runs'),
      client.get('/suites'),
    ])
    setRuns(runsRes.data)
    setSuites(suitesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [selectionVersion])

  async function openCreate() {
    setRunName('')
    setSuiteFilter('')
    setSelectedIds([])
    const { data } = await client.get('/test-cases')
    setTestCases(data)
    setModalOpen(true)
  }

  async function handleSuiteFilterChange(value) {
    setSuiteFilter(value)
    const params = value ? { suite_id: value } : {}
    const { data } = await client.get('/test-cases', { params })
    setTestCases(data)
  }

  function toggleId(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (selectedIds.length === testCases.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(testCases.map((tc) => tc.id))
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await client.post('/test-runs', {
        name: runName,
        test_case_ids: selectedIds,
      })
      setModalOpen(false)
      window.location.href = `/test-runs/${data.id}`
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this test run? Execution history will be lost.')) return
    await client.delete(`/test-runs/${id}`)
    await load()
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Test runs</h1>
          <p className="mt-1 text-sm text-ink-muted">Execute a batch of test cases and record outcomes.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New test run
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading test runs…</p>
      ) : runs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <PlayCircle size={28} className="mb-3 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">No test runs yet</p>
          <p className="mt-1 text-sm text-ink-muted">Start a run to begin executing your test cases.</p>
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary mt-4">
              <Plus size={16} /> New test run
            </button>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {runs.map((run) => (
            <div key={run.id} className="flex items-center gap-4 px-5 py-4">
              <Link to={`/test-runs/${run.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-ink hover:text-signal">{run.name}</p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      run.status === 'completed' ? 'bg-pass-soft text-pass' : 'bg-signal-soft text-signal'
                    }`}
                  >
                    {run.status === 'completed' ? 'Completed' : 'In progress'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {run.passed} passed · {run.failed} failed · {run.blocked} blocked · {run.pending} pending of {run.total}
                </p>
                <div className="mt-2 max-w-md">
                  <ProgressBar {...run} />
                </div>
              </Link>
              {(isAdmin || run.created_by === user?.id) && (
                <button
                  onClick={() => handleDelete(run.id)}
                  className="rounded p-2 text-ink-muted hover:bg-fail-soft hover:text-fail"
                  aria-label="Delete run"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New test run" width="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="runName">Run name</label>
            <input
              id="runName"
              required
              className="field-input"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder="e.g. Sprint 24 Regression"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="suiteFilter">Filter by suite</label>
            <select
              id="suiteFilter"
              className="field-input"
              value={suiteFilter}
              onChange={(e) => handleSuiteFilterChange(e.target.value)}
            >
              <option value="">All suites</option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="field-label mb-0">Select test cases</label>
              <button type="button" onClick={toggleAll} className="text-xs font-semibold text-signal hover:underline">
                {selectedIds.length === testCases.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded border border-line">
              {testCases.length === 0 && (
                <p className="p-4 text-center text-sm text-ink-muted">No test cases match this filter.</p>
              )}
              {testCases.map((tc) => (
                <label
                  key={tc.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-paper"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-signal focus:ring-signal"
                    checked={selectedIds.includes(tc.id)}
                    onChange={() => toggleId(tc.id)}
                  />
                  <span className="font-mono text-xs text-ink-muted">{tc.code}</span>
                  <span className="truncate text-sm text-ink">{tc.title}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">{selectedIds.length} selected</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving || selectedIds.length === 0} className="btn-primary">
              {saving ? 'Starting…' : 'Start test run'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
