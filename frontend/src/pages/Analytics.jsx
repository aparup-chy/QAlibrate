import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import client from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'

function healthColor(rate) {
  if (rate >= 85) return '#1E8E5A'
  if (rate >= 60) return '#C48A1E'
  return '#D6432E'
}

export default function Analytics() {
  const { selectionVersion } = useWorkspace()
  const [suiteHealth, setSuiteHealth] = useState([])
  const [flaky, setFlaky] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [healthRes, flakyRes] = await Promise.all([
        client.get('/analytics/suite-health'),
        client.get('/analytics/flaky-tests'),
      ])
      setSuiteHealth(healthRes.data)
      setFlaky(flakyRes.data)
      setLoading(false)
    }
    load()
  }, [selectionVersion])

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading analytics…</p>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">Where quality is strong, and where it needs attention.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold text-ink">Suite health — pass rate by suite</h2>
        {suiteHealth.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">No suites yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={suiteHealth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E6E4DD" />
              <XAxis
                dataKey="suite_name"
                tick={{ fontSize: 12, fill: '#6B7280' }}
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
                formatter={(value, name, props) => [`${value}%`, `Pass rate (${props.payload.total_executions} runs)`]}
              />
              <Bar dataKey="pass_rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {suiteHealth.map((entry, i) => (
                  <Cell key={i} fill={healthColor(entry.pass_rate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-blocked" />
          <h2 className="text-sm font-bold text-ink">Flaky test cases</h2>
        </div>
        <p className="mb-4 -mt-2 text-xs text-ink-muted">
          Test cases that have both passed and failed across executions — worth a closer look.
        </p>
        {flaky.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No flaky test cases detected yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="th-label pb-2">Code</th>
                <th className="th-label pb-2">Title</th>
                <th className="th-label pb-2 text-right">Passed</th>
                <th className="th-label pb-2 text-right">Failed</th>
                <th className="th-label pb-2 text-right">Total runs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {flaky.map((f) => (
                <tr key={f.code}>
                  <td className="py-2.5 font-mono text-xs text-ink-muted">{f.code}</td>
                  <td className="py-2.5 font-medium text-ink">{f.title}</td>
                  <td className="py-2.5 text-right text-pass font-semibold">{f.pass_count}</td>
                  <td className="py-2.5 text-right text-fail font-semibold">{f.fail_count}</td>
                  <td className="py-2.5 text-right text-ink-muted">{f.total_runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
