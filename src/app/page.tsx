'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { StatsCard } from '@/components/StatsCard'
import { CallsTable } from '@/components/CallsTable'
import { DatePicker } from '@/components/DatePicker'
import { FilterBar } from '@/components/FilterBar'
import { DEFAULT_INTERNAL_USERS } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'

interface Call {
  call_id: string
  user_id: string
  is_new_user: boolean
  initiated_at: string
  duration_seconds: number | null
  status: string
  total_turns: number
  language: string
}

interface Summary {
  total_calls: number
  welcome_calls: number
  daily_calls: number
  completed_calls: number
  avg_duration: number
  unique_users: number
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [callType, setCallType] = useState<'all' | 'welcome' | 'daily'>('all')
  const [excludeInternalUsers, setExcludeInternalUsers] = useState(true)
  const [calls, setCalls] = useState<Call[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchData()
  }, [selectedDate, callType, excludeInternalUsers])

  const fetchData = async () => {
    setLoading(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const excludeUsers = excludeInternalUsers ? DEFAULT_INTERNAL_USERS.join(',') : ''

      // Fetch calls
      const callsRes = await fetch(
        `/api/calls?date=${dateStr}&callType=${callType}&excludeUsers=${excludeUsers}`
      )
      const callsData = await callsRes.json()
      setCalls(callsData.calls || [])
      setTotal(callsData.total || 0)

      // Fetch daily summary
      const analyticsRes = await fetch(
        `/api/analytics?startDate=${dateStr}&endDate=${dateStr}&excludeUsers=${excludeUsers}`
      )
      const analyticsData = await analyticsRes.json()
      setSummary(analyticsData.summary || null)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Analytics Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Daily call analysis and performance metrics
          </p>
        </div>
        <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Calls"
          value={summary?.total_calls || 0}
          icon="📞"
          subtitle={`${summary?.completed_calls || 0} completed`}
        />
        <StatsCard
          title="Welcome Calls"
          value={summary?.welcome_calls || 0}
          icon="👋"
          subtitle="New users"
        />
        <StatsCard
          title="Daily Calls"
          value={summary?.daily_calls || 0}
          icon="📅"
          subtitle="Returning users"
        />
        <StatsCard
          title="Avg Duration"
          value={formatDuration(summary?.avg_duration || 0)}
          icon="⏱️"
          subtitle={`${summary?.unique_users || 0} unique users`}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <FilterBar
          callType={callType}
          onCallTypeChange={setCallType}
          excludeInternalUsers={excludeInternalUsers}
          onExcludeInternalUsersChange={setExcludeInternalUsers}
        />
      </div>

      {/* Calls Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Calls for {format(selectedDate, 'MMMM d, yyyy')}
          </h2>
          <span className="text-sm text-gray-500">{total} calls</span>
        </div>
        <CallsTable calls={calls} loading={loading} />
      </div>
    </div>
  )
}
