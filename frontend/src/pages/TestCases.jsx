import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Bot, ListChecks, Eye } from 'lucide-react'
import client from '../api/client'
import Modal from '../components/Modal'
import PriorityTag from '../components/PriorityTag'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const EMPTY_FORM = {
  suite_id: '',
  title: '',
  preconditions: '',
  steps: '',
  expected_result: '',
  priority: 'medium',
  is_automated: false,
}

export default function TestCases() {
  const { user } = useAuth()
  const { selectionVersion } = useWorkspace()
  const isAdmin = user?.role === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const suiteFilter = searchParams.get('suite_id') || ''

  const [suites, setSuites] = useState([])
  const [testCases, setTestCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingCase, setViewingCase] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (suiteFilter) params.suite_id = suiteFilter
    if (priorityFilter) params.priority = priorityFilter
    if (search) params.search = search
    const [tcRes, suiteRes] = await Promise.all([
      client.get('/test-cases', { params }),
      suites.length ? Promise.resolve({ data: suites }) : client.get('/suites'),
    ])
    setTestCases(tcRes.data)
    if (!suites.length) setSuites(suiteRes.data)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteFilter, priorityFilter, search, selectionVersion])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, suite_id: suiteFilter || suites[0]?.id || '' })
    setModalOpen(true)
  }

  function openEdit(tc) {
    setEditingId(tc.id)
    setForm({
      suite_id: tc.suite_id,
      title: tc.title,
      preconditions: tc.preconditions || '',
      steps: tc.steps || '',
      expected_result: tc.expected_result || '',
      priority: tc.priority,
      is_automated: tc.is_automated,
    })
    setModalOpen(true)
  }

  function openView(tc) {
    setViewingCase(tc)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, suite_id: Number(form.suite_id) }
      if (editingId) {
        await client.put(`/test-cases/${editingId}`, payload)
      } else {
        await client.post('/test-cases', payload)
      }
      setModalOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this test case?')) return
    await client.delete(`/test-cases/${id}`)
    await load()
  }

  const activeSuiteName = suites.find((s) => String(s.id) === String(suiteFilter))?.name

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Test cases</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {activeSuiteName ? `Showing cases in “${activeSuiteName}”` : 'All test cases across every suite.'}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> New test case
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="field-input w-64 pl-9"
            placeholder="Search by title or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="field-input w-auto"
          value={suiteFilter}
          onChange={(e) => setSearchParams(e.target.value ? { suite_id: e.target.value } : {})}
        >
          <option value="">All suites</option>
          {suites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className="field-input w-auto"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-ink-muted">Loading test cases…</p>
        ) : testCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks size={28} className="mb-3 text-ink-muted" />
            <p className="text-sm font-semibold text-ink">No test cases found</p>
            <p className="mt-1 text-sm text-ink-muted">Try clearing your filters, or add a new one.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="th-label px-5 py-3">Code</th>
                <th className="th-label px-5 py-3">Title</th>
                <th className="th-label px-5 py-3">Suite</th>
                <th className="th-label px-5 py-3">Priority</th>
                <th className="th-label px-5 py-3">Type</th>
                <th className="th-label px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {testCases.map((tc) => (
                <tr key={tc.id} className="transition-colors hover:bg-paper">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-ink-muted">{tc.code}</td>
                  <td className="px-5 py-3 font-medium text-ink">{tc.title}</td>
                  <td className="px-5 py-3 text-ink-muted">{tc.suite_name}</td>
                  <td className="px-5 py-3"><PriorityTag priority={tc.priority} /></td>
                  <td className="px-5 py-3">
                    {tc.is_automated ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-signal">
                        <Bot size={13} /> Automated
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-ink-muted">Manual</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(tc)} className="rounded p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="View test case">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(tc)} className="rounded p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="Edit test case">
                        <Pencil size={14} />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(tc.id)} className="rounded p-1.5 text-ink-muted hover:bg-fail-soft hover:text-fail" aria-label="Delete test case">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit test case' : 'New test case'}
        width="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="suite">Suite</label>
              <select
                id="suite"
                required
                className="field-input"
                value={form.suite_id}
                onChange={(e) => setForm({ ...form, suite_id: e.target.value })}
              >
                <option value="" disabled>Select a suite</option>
                {suites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="priority">Priority</label>
              <select
                id="priority"
                className="field-input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="title">Title</label>
            <input
              id="title"
              required
              className="field-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. User can reset password via email"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="preconditions">Preconditions</label>
            <textarea
              id="preconditions"
              rows={2}
              className="field-textarea"
              value={form.preconditions}
              onChange={(e) => setForm({ ...form, preconditions: e.target.value })}
              placeholder="What must be true before running this test?"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="steps">Steps</label>
            <textarea
              id="steps"
              rows={3}
              className="field-textarea"
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              placeholder={'1. …\n2. …\n3. …'}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="expected">Expected result</label>
            <textarea
              id="expected"
              rows={2}
              className="field-textarea"
              value={form.expected_result}
              onChange={(e) => setForm({ ...form, expected_result: e.target.value })}
              placeholder="What should happen if this test passes?"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-signal focus:ring-signal"
              checked={form.is_automated}
              onChange={(e) => setForm({ ...form, is_automated: e.target.checked })}
            />
            This test case is automated
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create test case'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewingCase)}
        onClose={() => setViewingCase(null)}
        title={viewingCase ? `${viewingCase.code}: ${viewingCase.title}` : 'Test case'}
        width="max-w-2xl"
      >
        {viewingCase && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="field-label">Suite</p>
                <p className="text-sm font-medium text-ink">{viewingCase.suite_name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="field-label">Priority</p>
                <PriorityTag priority={viewingCase.priority} />
              </div>
              <div>
                <p className="field-label">Type</p>
                <p className="text-sm font-medium text-ink">{viewingCase.is_automated ? 'Automated' : 'Manual'}</p>
              </div>
              <div>
                <p className="field-label">Created</p>
                <p className="text-sm font-medium text-ink">{new Date(viewingCase.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {[
              ['Preconditions', viewingCase.preconditions],
              ['Steps', viewingCase.steps],
              ['Expected result', viewingCase.expected_result],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="field-label">{label}</p>
                <p className="whitespace-pre-wrap rounded border border-line bg-paper px-3 py-2 text-sm leading-relaxed text-ink-soft">
                  {value || 'None provided'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
