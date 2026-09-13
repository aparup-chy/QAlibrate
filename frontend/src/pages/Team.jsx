import { useEffect, useState } from 'react'
import { MailPlus, ShieldCheck, UserX, UserCheck, Plus, Trash2 } from 'lucide-react'
import client from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'

export default function Team() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, reloadWorkspaces, loading: workspacesLoading, error: workspaceError } = useWorkspace()
  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('tester')
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [workspaceSaving, setWorkspaceSaving] = useState(false)
  const [workspaceActionError, setWorkspaceActionError] = useState('')

  async function load() {
    setLoading(true)
    const [usersRes, invitationsRes] = await Promise.all([
      client.get('/users'),
      client.get('/users/invitations'),
    ])
    setUsers(usersRes.data)
    setInvitations(invitationsRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!activeWorkspaceId) return
    client.get(`/workspace/workspaces/${activeWorkspaceId}/members`)
      .then(({ data }) => setWorkspaceMembers(data))
      .catch((err) => setWorkspaceActionError(err.response?.data?.detail || 'Could not load workspace members.'))
  }, [activeWorkspaceId, users])

  async function createWorkspace(e) {
    e.preventDefault()
    setWorkspaceSaving(true)
    setWorkspaceActionError('')
    try {
      const { data } = await client.post('/workspace/workspaces', { name: workspaceName })
      setWorkspaceName('')
      setActiveWorkspaceId(data.id)
      await reloadWorkspaces()
    } catch (err) {
      setWorkspaceActionError(err.response?.data?.detail || 'Could not create workspace. Check that the backend is running the latest code.')
    } finally {
      setWorkspaceSaving(false)
    }
  }

  async function deleteWorkspace() {
    const workspace = workspaces.find((item) => String(item.id) === String(activeWorkspaceId))
    if (!workspace) return
    if (workspaces.length <= 1) {
      setWorkspaceActionError('You cannot delete the last workspace.')
      return
    }
    if (!confirm(`Delete "${workspace.name}" and all of its test data? This cannot be undone.`)) return

    setWorkspaceSaving(true)
    setWorkspaceActionError('')
    try {
      await client.delete(`/workspace/workspaces/${workspace.id}`)
      setWorkspaceMembers([])
      await reloadWorkspaces()
    } catch (err) {
      setWorkspaceActionError(err.response?.data?.detail || 'Could not delete workspace.')
    } finally {
      setWorkspaceSaving(false)
    }
  }

  async function assignMember(userId, assigned) {
    setWorkspaceActionError('')
    try {
      await client.put(`/workspace/workspaces/${activeWorkspaceId}/members/${userId}`, { assigned })
      setWorkspaceMembers((members) => members.map((member) => (
        member.user_id === userId ? { ...member, assigned } : member
      )))
    } catch (err) {
      setWorkspaceActionError(err.response?.data?.detail || 'Could not update workspace assignment.')
    }
  }

  function removeMember(member) {
    const workspaceName = workspaces.find((workspace) => String(workspace.id) === String(activeWorkspaceId))?.name || 'this workspace'
    if (!confirm(`Remove ${member.full_name} from ${workspaceName}?`)) return
    assignMember(member.user_id, false)
  }

  async function invite(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await client.post('/users/invitations', { email, role })
      setInviteLink(`${window.location.origin}/register?invite=${data.token}`)
      setEmail('')
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create invitation.')
    } finally {
      setSaving(false)
    }
  }

  async function changeRole(user, nextRole) {
    await client.patch(`/users/${user.id}/role`, { role: nextRole })
    await load()
  }

  async function toggleStatus(user) {
    await client.patch(`/users/${user.id}/status`, { is_active: !user.is_active })
    await load()
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Team</h1>
          <p className="mt-1 text-sm text-ink-muted">Manage workspace access and invitations.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded bg-signal-soft px-2 py-1 text-xs font-semibold text-signal">
          <ShieldCheck size={13} /> Admin
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-ink">Members</h2>
          </div>
          {loading ? <p className="p-5 text-sm text-ink-muted">Loading team…</p> : (
            <div className="divide-y divide-line">
              {users.map((user) => {
                const workspaceMember = workspaceMembers.find((member) => member.user_id === user.id)
                return (
                  <div key={user.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 text-xs font-bold text-ink">
                    {user.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{user.full_name}</p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                  </div>
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user, e.target.value)}
                    className="field-input w-auto py-1.5 text-xs"
                    disabled={!user.is_active}
                    aria-label={`Role for ${user.full_name}`}
                  >
                    <option value="tester">Tester</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => toggleStatus(user)}
                    className={`rounded p-1.5 transition-colors ${
                      user.is_active
                        ? 'text-pass hover:bg-pass-soft hover:text-pass'
                        : 'text-fail hover:bg-fail-soft hover:text-fail'
                    }`}
                    aria-label={user.is_active ? `Deactivate ${user.full_name}` : `Activate ${user.full_name}`}
                    title={user.is_active ? 'Active account. Click to deactivate.' : 'Deactivated account. Click to activate.'}
                  >
                    {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                  </button>
                  {workspaceMember?.assigned && (
                    <button
                      type="button"
                      onClick={() => removeMember(workspaceMember)}
                      className="inline-flex items-center gap-1 rounded border border-fail/30 px-2 py-1.5 text-xs font-semibold text-fail hover:bg-fail-soft"
                      aria-label={`Remove ${user.full_name} from workspace`}
                      title="Remove from workspace"
                    >
                      <UserX size={14} /> Remove
                    </button>
                  )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={17} className="text-signal" />
            <h2 className="text-sm font-bold text-ink">Workspaces</h2>
          </div>
          <form onSubmit={createWorkspace} className="mb-5 flex gap-2">
            <input
              required
              className="field-input"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="New workspace name"
            />
            <button type="submit" disabled={workspaceSaving} className="btn-primary whitespace-nowrap px-3" aria-label="Create workspace">
              <Plus size={15} /> Create
            </button>
          </form>
          <label className="field-label" htmlFor="managedWorkspace">Assign members in</label>
          <div className="flex items-center gap-2">
            <select
              id="managedWorkspace"
              className="field-input"
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
              {workspaces.length === 0 && <option value="">No workspaces available</option>}
            </select>
            <button
              type="button"
              onClick={deleteWorkspace}
              disabled={workspaceSaving || workspaces.length <= 1}
              className="inline-flex items-center gap-2 rounded border border-fail/30 px-3 py-2 text-sm font-semibold text-fail transition-colors hover:bg-fail-soft disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Delete selected workspace"
              title={workspaces.length <= 1 ? 'The last workspace cannot be deleted' : 'Delete selected workspace'}
            >
              <Trash2 size={15} /> Delete workspace
            </button>
          </div>
          {(workspaceError || workspaceActionError) && (
            <p className="mt-3 rounded bg-fail-soft px-3 py-2 text-sm text-fail">
              {workspaceError || workspaceActionError}
            </p>
          )}
          <div className="mt-4 divide-y divide-line border-t border-line">
            {workspacesLoading ? (
              <p className="py-4 text-sm text-ink-muted">Loading workspaces…</p>
            ) : activeWorkspaceId ? workspaceMembers.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3 py-3 text-sm">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-signal focus:ring-signal"
                    checked={member.assigned}
                    onChange={(e) => {
                      if (!e.target.checked) return removeMember(member)
                      assignMember(member.user_id, e.target.checked)
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{member.full_name}</span>
                    <span className="block truncate text-xs text-ink-muted">{member.email}</span>
                  </span>
                </label>
              </div>
            )) : (
              <p className="py-4 text-sm text-ink-muted">Create or select a workspace to assign members.</p>
            )}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MailPlus size={17} className="text-signal" />
            <h2 className="text-sm font-bold text-ink">Invite a teammate</h2>
          </div>
          <form onSubmit={invite} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="inviteEmail">Email</label>
              <input id="inviteEmail" type="email" required className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </div>
            <div>
              <label className="field-label" htmlFor="inviteRole">Role</label>
              <select id="inviteRole" className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="tester">Tester</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{error}</p>}
            {inviteLink && (
              <div className="rounded bg-pass-soft px-3 py-2 text-xs text-pass">
                Invite link created. Share it with the teammate:
                <input readOnly className="field-input mt-2 text-xs" value={inviteLink} onFocus={(e) => e.target.select()} />
              </div>
            )}
            <button type="submit" disabled={saving} className="btn-primary w-full">
              <MailPlus size={16} /> {saving ? 'Creating…' : 'Create invite link'}
            </button>
          </form>
          <div className="mt-6 border-t border-line pt-4">
            <p className="th-label mb-2">Recent invitations</p>
            {invitations.length === 0 ? <p className="text-sm text-ink-muted">No invitations yet.</p> : invitations.slice(0, 5).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-2 text-xs">
                <span className="truncate text-ink">{invite.email}</span>
                <span className="text-ink-muted">{invite.accepted_at ? 'Accepted' : 'Pending'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
