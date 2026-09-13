import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(fullName, email, password, inviteToken)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-ink">
            <ClipboardCheck size={19} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none text-ink">QAlibrate</p>
            <p className="mt-1 text-[11px] font-medium text-ink-muted">QA Test Manager</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {inviteToken ? 'Complete your invitation to join the workspace.' : 'The first account created becomes the workspace admin.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="field-label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              required
              className="field-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Aparup Chowdhury"
            />
          </div>
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
              minLength={6}
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink hover:text-signal">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
