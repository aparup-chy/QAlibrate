import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, FolderKanban } from 'lucide-react'
import client from '../api/client'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const EMPTY_FORM = { name: '', description: '' }

export default function Suites() {
  const { user } = useAuth()
  const { selectionVersion } = useWorkspace()
  const isAdmin = user?.role === 'admin'
  const [suites, setSuites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await client.get('/suites')
    setSuites(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [selectionVersion])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(suite) {
    setEditingId(suite.id)
    setForm({ name: suite.name, description: suite.description })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await client.put(`/suites/${editingId}`, form)
      } else {
        await client.post('/suites', form)
      }
      setModalOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this suite and all of its test cases?')) return
    await client.delete(`/suites/${id}`)
    await load()
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Test suites</h1>
          <p className="mt-1 text-sm text-ink-muted">Group related test cases by feature or module.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New suite
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading suites…</p>
      ) : suites.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban size={28} className="mb-3 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">No suites yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create your first suite to start organizing test cases.</p>
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary mt-4">
              <Plus size={16} /> New suite
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite) => (
            <div key={suite.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <Link to={`/test-cases?suite_id=${suite.id}`} className="min-w-0">
                  <h3 className="truncate text-[15px] font-bold text-ink hover:text-signal">{suite.name}</h3>
                </Link>
                {isAdmin && (
                  <div className="flex flex-shrink-0 gap-1">
                    <button onClick={() => openEdit(suite)} className="rounded p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="Edit suite">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(suite.id)} className="rounded p-1.5 text-ink-muted hover:bg-fail-soft hover:text-fail" aria-label="Delete suite">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-muted">
                {suite.description || 'No description provided.'}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs font-semibold text-ink-muted">
                  {suite.test_case_count} test case{suite.test_case_count !== 1 ? 's' : ''}
                </span>
                <Link to={`/test-cases?suite_id=${suite.id}`} className="text-xs font-semibold text-signal hover:underline">
                  View cases
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit suite' : 'New suite'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="name">Name</label>
            <input
              id="name"
              required
              className="field-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Authentication"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              className="field-textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this suite cover?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create suite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
