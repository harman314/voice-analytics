'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import { StatsCard } from '@/components/StatsCard'
import { LatencyBreakdown } from '@/components/LatencyBreakdown'
import { DEFAULT_INTERNAL_USERS, LAG_THRESHOLDS } from '@/lib/constants'
import { truncateUserId } from '@/lib/utils'

interface LagEpisode {
  call_id: string
  user_id: string
  timestamp: string
  item_id: string
  lag_type: string
  lag_value: number
  threshold: number
}

interface DailyStat {
  date: string
  high_latency_count: number
  avg_e2e_latency: number
  max_e2e_latency: number
  dropoff_count: number
}

interface ComponentBreakdown {
  stt: { avg: number; p50: number; p95: number; count: number }
  llm: { avg: number; p50: number; p95: number; count: number; pctOfE2E: number }
  tts: { avg: number; p50: number; p95: number; count: number; pctOfE2E: number }
  e2e: { avg: number; p50: number; p95: number; count: number }
  endOfTurn: { avg: number; p50: number; p95: number; count: number }
  other: { avg: number; pctOfE2E: number }
}

export default function LagAnalysisPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [excludeInternalUsers, setExcludeInternalUsers] = useState(true)
  const [lagEpisodes, setLagEpisodes] = useState<LagEpisode[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [componentBreakdown, setComponentBreakdown] = useState<ComponentBreakdown | null>(null)
  const [languageBreakdown, setLanguageBreakdown] = useState<Record<string, ComponentBreakdown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLagData()
  }, [dateRange, excludeInternalUsers])

  const fetchLagData = async () => {
    setLoading(true)
    try {
      const excludeUsers = excludeInternalUsers ? DEFAULT_INTERNAL_USERS.join(',') : ''
      const res = await fetch(
        `/api/analytics/lag?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&excludeUsers=${excludeUsers}`
      )
      const data = await res.json()
      setLagEpisodes(data.lagEpisodes || [])
      setDailyStats(data.dailyStats || [])
      setComponentBreakdown(data.componentBreakdown || null)
      setLanguageBreakdown(data.languageBreakdown || null)
    } catch (error) {
      console.error('Error fetching lag data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary stats
  const totalHighLatency = dailyStats.reduce((sum, d) => sum + d.high_latency_count, 0)
  const totalDropoffs = dailyStats.reduce((sum, d) => sum + d.dropoff_count, 0)
  const avgLatency = dailyStats.length > 0
    ? dailyStats.reduce((sum, d) => sum + d.avg_e2e_latency, 0) / dailyStats.length
    : 0
  const maxLatency = dailyStats.length > 0
    ? Math.max(...dailyStats.map(d => d.max_e2e_latency))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lag & Dropoff Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor latency issues and call dropoffs
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeInternalUsers}
            onChange={(e) => setExcludeInternalUsers(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-600">Exclude internal users</span>
        </label>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="High Latency Events"
          value={totalHighLatency}
          icon="⚠️"
          subtitle={`> ${LAG_THRESHOLDS.e2e_latency}s threshold`}
        />
        <StatsCard
          title="Call Dropoffs"
          value={totalDropoffs}
          icon="📉"
          subtitle="Short calls with few turns"
        />
        <StatsCard
          title="Avg E2E Latency"
          value={`${avgLatency.toFixed(2)}s`}
          icon="⏱️"
          subtitle="Across all calls"
        />
        <StatsCard
          title="Max Latency"
          value={`${maxLatency.toFixed(2)}s`}
          icon="🔴"
          subtitle="Worst case observed"
        />
      </div>

      {/* Thresholds Info */}
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">📊 Current Thresholds</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-amber-600">E2E Latency:</span>{' '}
            <span className="font-medium">{LAG_THRESHOLDS.e2e_latency}s</span>
          </div>
          <div>
            <span className="text-amber-600">LLM TTFT:</span>{' '}
            <span className="font-medium">{LAG_THRESHOLDS.llm_ttft}s</span>
          </div>
          <div>
            <span className="text-amber-600">TTS TTFB:</span>{' '}
            <span className="font-medium">{LAG_THRESHOLDS.tts_ttfb}s</span>
          </div>
          <div>
            <span className="text-amber-600">STT Delay:</span>{' '}
            <span className="font-medium">{LAG_THRESHOLDS.transcription_delay}s</span>
          </div>
          <div>
            <span className="text-amber-600">End of Turn:</span>{' '}
            <span className="font-medium">{LAG_THRESHOLDS.end_of_turn}s</span>
          </div>
        </div>
      </div>

      {/* Component Latency Breakdown */}
      {!loading && (
        <LatencyBreakdown
          componentBreakdown={componentBreakdown}
          languageBreakdown={languageBreakdown}
        />
      )}

      {/* Daily Stats Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">📅 Daily Breakdown</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : dailyStats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No data available for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">High Latency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg E2E</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max E2E</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dropoffs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dailyStats.map((stat) => (
                  <tr key={stat.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {stat.date}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${stat.high_latency_count > 5 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {stat.high_latency_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${stat.avg_e2e_latency > LAG_THRESHOLDS.e2e_latency ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {stat.avg_e2e_latency.toFixed(2)}s
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${stat.max_e2e_latency > LAG_THRESHOLDS.e2e_latency * 1.5 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {stat.max_e2e_latency.toFixed(2)}s
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${stat.dropoff_count > 3 ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        {stat.dropoff_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Lag Episodes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">⚠️ Recent High Latency Events</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : lagEpisodes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No high latency events in this period 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lagEpisodes.slice(0, 20).map((episode, idx) => (
                  <tr key={`${episode.call_id}-${episode.item_id}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {episode.timestamp.split('T')[0]}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {truncateUserId(episode.user_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {episode.lag_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${episode.lag_value > episode.threshold * 1.5 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {episode.lag_value.toFixed(2)}s
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {episode.threshold}s
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/call/${episode.call_id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        View Call →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
