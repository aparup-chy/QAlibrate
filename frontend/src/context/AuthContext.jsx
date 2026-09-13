import { createContext, useContext, useState, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('qa_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const { data } = await client.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('qa_token', data.access_token)
    localStorage.setItem('qa_user', JSON.stringify(data.user))
    localStorage.removeItem('qa_workspace_id')
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (fullName, email, password, inviteToken) => {
    const { data } = await client.post('/auth/register', {
      full_name: fullName,
      email,
      password,
      invite_token: inviteToken || undefined,
    })
    localStorage.setItem('qa_token', data.access_token)
    localStorage.setItem('qa_user', JSON.stringify(data.user))
    localStorage.removeItem('qa_workspace_id')
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('qa_token')
    localStorage.removeItem('qa_user')
    localStorage.removeItem('qa_workspace_id')
    setUser(null)
  }, [])

  const updateUser = useCallback((updatedUser) => {
    localStorage.setItem('qa_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
