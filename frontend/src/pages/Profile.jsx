import { useState } from 'react'
import { UserRound, LockKeyhole, Save } from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [account, setAccount] = useState({ full_name: user?.full_name || '', email: user?.email || '' })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [accountMessage, setAccountMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [accountError, setAccountError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  async function saveAccount(e) {
    e.preventDefault()
    setSavingAccount(true)
    setAccountMessage('')
    setAccountError('')
    try {
      const { data } = await client.patch('/auth/me', account)
      updateUser(data)
      setAccountMessage('Profile details saved.')
    } catch (err) {
      setAccountError(err.response?.data?.detail || 'Could not save profile details.')
    } finally {
      setSavingAccount(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordMessage('')
    setPasswordError('')
    try {
      await client.patch('/auth/me', passwords)
      setPasswords({ current_password: '', new_password: '' })
      setPasswordMessage('Password changed successfully.')
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Could not change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your profile</h1>
        <p className="mt-1 text-sm text-ink-muted">Update your personal details and sign-in credentials.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-5 flex items-center gap-2">
            <UserRound size={17} className="text-signal" />
            <h2 className="text-sm font-bold text-ink">Personal details</h2>
          </div>
          <form onSubmit={saveAccount} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="profileName">Full name</label>
              <input id="profileName" required className="field-input" value={account.full_name} onChange={(e) => setAccount({ ...account, full_name: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="profileEmail">Email</label>
              <input id="profileEmail" required type="email" className="field-input" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            </div>
            <div className="rounded bg-paper px-3 py-2 text-xs text-ink-muted">
              Role: <span className="font-semibold capitalize text-ink-soft">{user?.role}</span>
            </div>
            {accountError && <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{accountError}</p>}
            {accountMessage && <p className="rounded bg-pass-soft px-3 py-2 text-sm text-pass">{accountMessage}</p>}
            <button type="submit" disabled={savingAccount} className="btn-primary"><Save size={16} /> {savingAccount ? 'Saving…' : 'Save details'}</button>
          </form>
        </section>

        <section className="card p-5">
          <div className="mb-5 flex items-center gap-2">
            <LockKeyhole size={17} className="text-signal" />
            <h2 className="text-sm font-bold text-ink">Change password</h2>
          </div>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="currentPassword">Current password</label>
              <input id="currentPassword" required type="password" className="field-input" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="newPassword">New password</label>
              <input id="newPassword" required minLength={6} type="password" className="field-input" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} placeholder="At least 6 characters" />
            </div>
            {passwordError && <p className="rounded bg-fail-soft px-3 py-2 text-sm text-fail">{passwordError}</p>}
            {passwordMessage && <p className="rounded bg-pass-soft px-3 py-2 text-sm text-pass">{passwordMessage}</p>}
            <button type="submit" disabled={savingPassword} className="btn-primary"><LockKeyhole size={16} /> {savingPassword ? 'Changing…' : 'Change password'}</button>
          </form>
        </section>
      </div>
    </div>
  )
}
