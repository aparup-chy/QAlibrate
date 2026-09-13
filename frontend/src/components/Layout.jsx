import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Gauge,
  FolderKanban,
  ListChecks,
  PlayCircle,
  BarChart3,
  LogOut,
  ClipboardCheck,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/suites', label: 'Suites', icon: FolderKanban },
  { to: '/test-cases', label: 'Test Cases', icon: ListChecks },
  { to: '/test-runs', label: 'Test Runs', icon: PlayCircle },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { workspaces, activeWorkspaceId, selectedWorkspaceIds, isAllWorkspaces, setActiveWorkspaceId, setWorkspaceSelection } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('qa_sidebar_collapsed') === 'true')
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const workspaceMenuRef = useRef(null)
  const selectedWorkspaceNames = workspaces
    .filter((workspace) => selectedWorkspaceIds.includes(String(workspace.id)))
    .map((workspace) => workspace.name)

  useEffect(() => {
    if (!workspaceMenuOpen) return undefined

    function closeOnOutsideClick(event) {
      if (!workspaceMenuRef.current?.contains(event.target)) {
        setWorkspaceMenuOpen(false)
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setWorkspaceMenuOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [workspaceMenuOpen])

  function handleLogout() {
    logout()
    navigate('/')
  }

  function toggleSidebar() {
    setIsCollapsed((collapsed) => {
      const next = !collapsed
      localStorage.setItem('qa_sidebar_collapsed', String(next))
      return next
    })
  }

  const initials = (user?.full_name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const navItems = user?.role === 'admin'
    ? [...NAV_ITEMS, { to: '/team', label: 'Team', icon: Users }, { to: '/settings', label: 'Settings', icon: Settings }]
    : NAV_ITEMS

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className={`flex flex-shrink-0 flex-col bg-ink text-white transition-[width] duration-200 ${isCollapsed ? 'w-[4.5rem]' : 'w-64'}`}>
        <div className={`flex items-center px-4 py-6 ${isCollapsed ? 'flex-col gap-2' : 'gap-2.5 px-6'}`}>
          <Link to="/" className="flex items-center gap-2.5" aria-label="Go to QAlibrate homepage">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-signal">
              <ClipboardCheck size={18} className="text-white" />
            </div>
            {!isCollapsed && <div>
              <p className="text-[15px] font-bold leading-none tracking-tight">QAlibrate</p>
              <p className="mt-1 text-[11px] font-medium text-white/40">QA Test Manager</p>
            </div>}
          </Link>
          <button
            onClick={toggleSidebar}
            className={`rounded p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white ${isCollapsed ? '' : 'ml-auto'}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center rounded px-3 py-2.5 text-sm font-medium transition-colors ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {!isCollapsed && label}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-white/10 px-4 py-4 ${isCollapsed ? 'px-3' : ''}`}>
          <div className={`flex items-center rounded px-2 py-2 ${isCollapsed ? 'flex-col gap-3' : 'gap-3'}`}>
            <button
              onClick={() => navigate('/profile')}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold transition-colors hover:bg-white/20"
              aria-label="Open profile"
            >
              {initials}
            </button>
            {!isCollapsed && <div className="min-w-0 flex-1">
              <button
                onClick={() => navigate('/profile')}
                className="block max-w-full break-words text-left text-[13px] font-semibold text-white/90 hover:text-white"
              >
                {user?.full_name}
              </button>
              <p className="truncate text-[11px] text-white/40">{user?.role}</p>
            </div>}
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {workspaces.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-8 pt-5">
            <label className="text-xs font-semibold text-ink-muted" htmlFor="workspaceSwitcher">Workspace</label>
            {user?.role === 'admin' ? (
              <div ref={workspaceMenuRef} className="relative">
                <button
                  id="workspaceSwitcher"
                  type="button"
                  className="field-input max-w-72 min-w-48 truncate py-1.5 text-left text-xs"
                  aria-expanded={workspaceMenuOpen}
                  onClick={() => setWorkspaceMenuOpen((open) => !open)}
                  title={isAllWorkspaces ? 'All workspaces' : selectedWorkspaceNames.join(', ')}
                >
                  {isAllWorkspaces ? 'All workspaces' : selectedWorkspaceNames.join(', ')}
                </button>
                {workspaceMenuOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-56 rounded border border-line bg-white p-2 shadow-lg">
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs font-semibold text-ink hover:bg-paper">
                      <input
                        type="checkbox"
                        checked={isAllWorkspaces}
                        onChange={() => {
                          setWorkspaceSelection(['all'])
                        }}
                      />
                      All workspaces
                    </label>
                    <div className="my-1 border-t border-line" />
                    {workspaces.map((workspace) => (
                      <label key={workspace.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs text-ink hover:bg-paper">
                        <input
                          type="checkbox"
                          checked={!isAllWorkspaces && selectedWorkspaceIds.includes(String(workspace.id))}
                          onChange={(e) => {
                            const currentSelection = isAllWorkspaces ? [] : selectedWorkspaceIds
                            const next = e.target.checked
                              ? [...currentSelection, String(workspace.id)]
                              : currentSelection.filter((id) => id !== String(workspace.id))
                            setWorkspaceSelection(next)
                          }}
                        />
                        <span className="truncate">{workspace.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <select
                id="workspaceSwitcher"
                className="field-input w-auto py-1.5 text-xs"
                value={activeWorkspaceId}
                onChange={(e) => {
                  setActiveWorkspaceId(e.target.value)
                  window.location.reload()
                }}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
        <div key={location.pathname} className="workspace-transition mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
