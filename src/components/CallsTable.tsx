'use client'

import Link from 'next/link'
import { formatDuration, formatTime, truncateUserId } from '@/lib/utils'

interface Call {
  call_id: string
  user_id: string
  is_new_user: boolean
  initiated_at: string
  duration_seconds: number | null
  status: string
  total_turns: number
  language: string
  max_lag?: number
  lag_episodes?: number
  lag_type?: string | null
}

interface CallsTableProps {
  calls: Call[]
  loading?: boolean
}

// Get lag indicator based on max lag value
function getLagIndicator(maxLag: number): { color: string; emoji: string } {
  if (maxLag === 0) return { color: 'text-gray-400', emoji: '–' }
  if (maxLag < 4) return { color: 'text-green-600', emoji: '🟢' }
  if (maxLag < 6) return { color: 'text-yellow-600', emoji: '🟡' }
  return { color: 'text-red-600', emoji: '🔴' }
}

export function CallsTable({ calls, loading }: CallsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading calls...</div>
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No calls found for this date</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Turns
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lang
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lag
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calls.map((call) => (
              <tr key={call.call_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(call.initiated_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                  {truncateUserId(call.user_id)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      call.is_new_user
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {call.is_new_user ? '👋 Welcome' : '📅 Daily'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(call.duration_seconds)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {call.total_turns}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      call.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : call.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {call.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 uppercase">
                  {call.language}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {call.max_lag !== undefined && call.max_lag > 0 ? (
                    <Link
                      href={`/call/${call.call_id}?highlight=lag`}
                      className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      title={`Max lag: ${call.max_lag.toFixed(1)}s (${call.lag_type})`}
                    >
                      <span>{getLagIndicator(call.max_lag).emoji}</span>
                      <span className={`text-sm font-medium ${getLagIndicator(call.max_lag).color}`}>
                        {call.max_lag.toFixed(1)}s
                      </span>
                      {call.lag_episodes && call.lag_episodes > 0 && (
                        <span className="text-xs text-gray-500">
                          ({call.lag_episodes})
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-sm">–</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Link
                    href={`/call/${call.call_id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
