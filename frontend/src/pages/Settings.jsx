import { useEffect, useState } from 'react'
import { Download, KeyRound, Save, Trash2 } from 'lucide-react'
import client from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'

export default function Settings() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, updateWorkspaceName, reloadWorkspaces, loading: workspacesLoading } = useWorkspace()
  const [settings, setSettings] = useState(null)
  const [keys, setKeys] = useState([])
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load(workspaceId) {
    setSettings(null)
    const workspaceHeaders = { headers: { 'X-Workspace-ID': workspaceId } }
    const [settingsRes, keysRes] = await Promise.all([
      client.get('/workspace/settings', workspaceHeaders),
      client.get('/workspace/api-keys', workspaceHeaders),
    ])
    setSettings(settingsRes.data)
    setKeys(keysRes.data)
  }

  useEffect(() => {
    if (activeWorkspaceId && !workspacesLoading) load(activeWorkspaceId)
  }, [activeWorkspaceId, workspacesLoading])

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await client.put('/workspace/settings', settings, {
        headers: { 'X-Workspace-ID': activeWorkspaceId },
      })
      updateWorkspaceName(activeWorkspaceId, data.name)
      await reloadWorkspaces()
      setMessage('Workspace settings saved.')
    } finally {
      setSaving(false)
    }
  }

  async function createKey(e) {
    e.preventDefault()
    const { data } = await client.post('/workspace/api-keys', { name: keyName }, {
      headers: { 'X-Workspace-ID': activeWorkspaceId },
    })
    setNewKey(data.token)
    setKeyName('')
    await load(activeWorkspaceId)
  }

  async function revokeKey(id) {
    if (!confirm('Revoke this API key? Automation using it will stop working.')) return
    await client.delete(`/workspace/api-keys/${id}`, {
      headers: { 'X-Workspace-ID': activeWorkspaceId },
    })
    await load(activeWorkspaceId)
  }

  async function exportReport() {
    const { data } = await client.get('/analytics/export.csv', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'qalibrate-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!settings) return <p className="text-sm text-ink-muted">Loading settings…</p>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Workspace settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Configure access policy and automation connections.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-ink">Workspace policy</h2>
            {workspaces.length > 1 && (
              <select
                aria-label="Workspace to configure"
                className="field-input w-auto py-1.5 text-xs"
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
              >
                {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select>
            )}
          </div>
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="workspaceName">Workspace name</label>
              <input id="workspaceName" className="field-input" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="defaultPriority">Default priority</label>
              <select id="defaultPriority" className="field-input" value={settings.default_priority} onChange={(e) => setSettings({ ...settings, default_priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="webhookUrl">Automation webhook URL</label>
              <input id="webhookUrl" type="url" className="field-input" value={settings.automation_webhook_url || ''} onChange={(e) => setSettings({ ...settings, automation_webhook_url: e.target.value })} placeholder="https://automation.example/results" />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-soft">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-line text-signal focus:ring-signal" checked={settings.require_invite} onChange={(e) => setSettings({ ...settings, require_invite: e.target.checked })} />
              Require an invitation for new registrations
            </label>
            {message && <p className="rounded bg-pass-soft px-3 py-2 text-sm text-pass">{message}</p>}
            <button type="submit" disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save settings'}</button>
          </form>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><KeyRound size={17} className="text-signal" /><h2 className="text-sm font-bold text-ink">Automation API keys</h2></div>
            <button onClick={exportReport} className="btn-secondary px-3 py-2 text-xs"><Download size={14} /> Export report</button>
          </div>
          <form onSubmit={createKey} className="flex gap-2">
            <input required className="field-input" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="pytest integration" />
            <button className="btn-primary whitespace-nowrap" type="submit">Generate key</button>
          </form>
          {newKey && <div className="mt-4 rounded bg-blocked-soft px-3 py-2 text-xs text-blocked">Copy this key now. It will not be shown again.<input readOnly className="field-input mt-2 text-xs" value={newKey} onFocus={(e) => e.target.select()} /></div>}
          <div className="mt-5 divide-y divide-line">
            {keys.length === 0 ? <p className="py-3 text-sm text-ink-muted">No active keys.</p> : keys.map((apiKey) => (
              <div key={apiKey.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{apiKey.name}</p><p className="font-mono text-xs text-ink-muted">{apiKey.key_prefix}…</p></div>
                <button onClick={() => revokeKey(apiKey.id)} className="rounded p-1.5 text-ink-muted hover:bg-fail-soft hover:text-fail" aria-label={`Revoke ${apiKey.name}`}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-muted">Use the key in the <span className="font-mono">X-API-Key</span> header when posting automation results to <span className="font-mono">/automation/results</span>.</p>
        </section>
      </div>
    </div>
  )
}
