import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Suites from './pages/Suites'
import TestCases from './pages/TestCases'
import TestRuns from './pages/TestRuns'
import RunDetail from './pages/RunDetail'
import Analytics from './pages/Analytics'
import Team from './pages/Team'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Home from './pages/Home'
import About from './pages/About'
import ForgotPassword from './pages/ForgotPassword'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/suites" element={<ProtectedRoute><Suites /></ProtectedRoute>} />
      <Route path="/test-cases" element={<ProtectedRoute><TestCases /></ProtectedRoute>} />
      <Route path="/test-runs" element={<ProtectedRoute><TestRuns /></ProtectedRoute>} />
      <Route path="/test-runs/:runId" element={<ProtectedRoute><RunDetail /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/team" element={<AdminRoute><Team /></AdminRoute>} />
      <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
