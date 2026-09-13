import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState('email')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function requestCode(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await client.post('/auth/forgot-password', { email })
      setMessage(data.message)
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send a reset code.')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await client.post('/auth/reset-password', {
        email,
        otp,
        new_password: newPassword,
      })
      setMessage('Your password has been reset. Redirecting to sign in…')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not reset your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="animate-rise w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-ink"><ClipboardCheck size={19} className="text-white" /></div>
          <div><p className="text-[15px] font-bold leading-none text-ink">QAlibrate</p><p className="mt-1 text-[11px] font-medium text-ink-muted">QA Test Manager</p></div>
        </Link>

        <Link to="/login" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"><ArrowLeft size={15} /> Back to sign in</Link>
        <h1 className="text-2xl font-bold text-ink">Reset your password</h1>
        <p className="mt-1.5 text-sm text-ink-muted">{step === 'email' ? 'Enter your registered email and we will send you a reset code.' : 'Enter the six-digit code from your email and choose a new password.'}</p>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="mt-8 space-y-4">
            <div><label className="field-label" htmlFor="resetEmail">Email</label><div className="relative"><Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" /><input id="resetEmail" type="email" required className="field-input pl-9" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></div></div>
            {error && <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending code…' : 'Send reset code'} {!loading && <ArrowRight size={16} />}</button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-8 space-y-4">
            <div className="rounded bg-signal-soft px-3 py-2 text-sm text-signal"><CheckCircle2 size={15} className="mr-1 inline" />{message}</div>
            <div><label className="field-label" htmlFor="otp">Reset code</label><input id="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="field-input font-mono tracking-[0.35em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></div>
            <div><label className="field-label" htmlFor="newPassword">New password</label><input id="newPassword" type="password" minLength={6} required className="field-input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 6 characters" /></div>
            {error && <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Resetting…' : 'Reset password'} {!loading && <ArrowRight size={16} />}</button>
          </form>
        )}
      </div>
    </div>
  )
}
