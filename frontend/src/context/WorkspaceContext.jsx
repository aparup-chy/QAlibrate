import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from './AuthContext'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(() => localStorage.getItem('qa_workspace_id') || '')
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState(() => {
    const storedScope = localStorage.getItem('qa_workspace_scope')
    if (storedScope === 'all') return ['all']
    if (storedScope) return storedScope.split(',').filter(Boolean)
    return localStorage.getItem('qa_workspace_id') ? [localStorage.getItem('qa_workspace_id')] : ['all']
  })
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function applyWorkspaceSelection(data) {
    const storedScope = localStorage.getItem('qa_workspace_scope')
    const storedId = localStorage.getItem('qa_workspace_id')
    let selection
    if (user?.role === 'admin' && (storedScope === 'all' || (!storedScope && !storedId))) {
      selection = ['all']
    } else if (user?.role === 'admin' && storedScope) {
      const ids = storedScope.split(',').filter((id) => data.some((workspace) => String(workspace.id) === id))
      selection = ids.length ? ids : ['all']
    } else {
      const selected = data.find((workspace) => String(workspace.id) === String(storedId)) || data[0]
      selection = selected ? [String(selected.id)] : []
    }
    const activeId = selection[0] === 'all' ? data[0]?.id : selection[0]
    setSelectedWorkspaceIds(selection)
    setSelectionVersion((version) => version + 1)
    if (activeId) {
      setActiveWorkspaceIdState(String(activeId))
      localStorage.setItem('qa_workspace_id', String(activeId))
    } else {
      setActiveWorkspaceIdState('')
      localStorage.removeItem('qa_workspace_id')
    }
    localStorage.setItem('qa_workspace_scope', selection[0] === 'all' ? 'all' : selection.join(','))
  }

  const reloadWorkspaces = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data } = await client.get('/workspace/workspaces')
      setWorkspaces(data)
      applyWorkspaceSelection(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load workspaces. Restart the backend and try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setWorkspaces([])
      setActiveWorkspaceIdState('')
      setSelectedWorkspaceIds([])
      setError('')
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data } = await client.get('/workspace/workspaces')
        if (cancelled) return
        setWorkspaces(data)
        applyWorkspaceSelection(data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || 'Could not load workspaces. Restart the backend and try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  function setActiveWorkspaceId(id) {
    setActiveWorkspaceIdState(String(id))
    localStorage.setItem('qa_workspace_id', String(id))
    setSelectedWorkspaceIds([String(id)])
    setSelectionVersion((version) => version + 1)
    localStorage.setItem('qa_workspace_scope', String(id))
  }

  function setWorkspaceSelection(values) {
    const selection = values.includes('all') || values.length === 0 ? ['all'] : values
    const activeId = selection[0] === 'all' ? workspaces[0]?.id : selection[0]
    setSelectedWorkspaceIds(selection)
    setSelectionVersion((version) => version + 1)
    if (activeId) {
      setActiveWorkspaceIdState(String(activeId))
      localStorage.setItem('qa_workspace_id', String(activeId))
    }
    localStorage.setItem('qa_workspace_scope', selection[0] === 'all' ? 'all' : selection.join(','))
  }

  function updateWorkspaceName(id, name) {
    setWorkspaces((current) => current.map((workspace) => (
      String(workspace.id) === String(id) ? { ...workspace, name } : workspace
    )))
  }

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspaceId, selectedWorkspaceIds, selectionVersion, isAllWorkspaces: selectedWorkspaceIds[0] === 'all', setActiveWorkspaceId, setWorkspaceSelection, updateWorkspaceName, reloadWorkspaces, loading, error }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
