import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [blockedMessage, setBlockedMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.detail || 'Could not sign in. Check your credentials.'
      setError(message)
      if (err.response?.status === 403) setBlockedMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-ink"><ClipboardCheck size={17} className="text-white" /></span>
            <span><span className="block text-[15px] font-bold leading-none tracking-tight">QAlibrate</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">QA test manager</span></span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink">Back to homepage</Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <div className="animate-rise w-full max-w-sm">

        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Track suites, executions and quality trends in one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-semibold text-signal hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          New here?{' '}
          <Link to="/register" className="font-semibold text-ink hover:text-signal">
            Create an account
          </Link>
        </p>

        {/* <div className="mt-6 rounded border border-line bg-white px-4 py-3 text-xs text-ink-muted">
          Demo credentials are pre-filled. Run <code className="font-mono text-ink-soft">python seed.py</code> in
          the backend folder to load sample data.
        </div> */}
      </div>
      </div>
      {blockedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" role="presentation">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="blockedTitle">
            <h2 id="blockedTitle" className="text-lg font-bold text-ink">Account temporarily deactivated</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{blockedMessage}</p>
            <button type="button" className="btn-primary mt-5 w-full" onClick={() => setBlockedMessage('')}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
