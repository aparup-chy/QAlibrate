import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ListChecks, FolderKanban, Gauge, PlayCircle, ArrowUpRight } from 'lucide-react'
import client from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

function StatBlock({ label, value, icon: Icon, suffix }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="th-label">{label}</p>
        <Icon size={16} className="text-ink-muted" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-ink">
        {value}
        {suffix && <span className="ml-1 text-lg font-semibold text-ink-muted">{suffix}</span>}
      </p>
    </div>
  )
}

function runStatus(run) {
  if (run.status === 'completed') {
    return run.failed > 0 ? 'failed' : 'passed'
  }
  return 'pending'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { selectionVersion } = useWorkspace()
  const [overview, setOverview] = useState(null)
  const [runs, setRuns] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [overviewRes, runsRes, trendRes] = await Promise.all([
        client.get('/analytics/overview'),
        client.get('/test-runs'),
        client.get('/analytics/run-trend'),
      ])
      setOverview(overviewRes.data)
      setRuns(runsRes.data.slice(0, 6))
      setTrend(trendRes.data)
      setLoading(false)
    }
    load()
  }, [selectionVersion])

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading dashboard…</p>
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            A snapshot of your test coverage and recent execution health.
          </p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/test-runs" className="btn-primary">
            New test run
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBlock label="Test Cases" value={overview.total_test_cases} icon={ListChecks} />
        <StatBlock label="Suites" value={overview.total_suites} icon={FolderKanban} />
        <StatBlock label="Overall Pass Rate" value={overview.overall_pass_rate} suffix="%" icon={Gauge} />
        <StatBlock label="Active Runs" value={overview.active_run_count} icon={PlayCircle} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Pass rate trend</h2>
            <span className="th-label">Last {trend.length} runs</span>
          </div>
          {trend.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-ink-muted">
              Run and complete a test run to see trend data here.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E6E4DD" />
                <XAxis
                  dataKey="run_name"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E6E4DD' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 6, border: '1px solid #E6E4DD', fontSize: 12 }}
                  formatter={(value) => [`${value}%`, 'Pass rate']}
                />
                <Line
                  type="monotone"
                  dataKey="pass_rate"
                  stroke="#3452FF"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3452FF' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Recent runs</h2>
            <Link to="/test-runs" className="flex items-center gap-1 text-xs font-semibold text-signal hover:underline">
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {runs.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-muted">No test runs yet.</p>
            )}
            {runs.map((run) => (
              <Link
                key={run.id}
                to={`/test-runs/${run.id}`}
                className="flex items-center justify-between py-3 transition-colors hover:bg-paper -mx-1 px-1 rounded"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{run.name}</p>
                  <p className="text-xs text-ink-muted">
                    {run.total} test case{run.total !== 1 ? 's' : ''}
                  </p>
                </div>
                <StatusBadge status={run.status === 'in_progress' ? 'pending' : runStatus(run)} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
