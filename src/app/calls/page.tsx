'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { CallsTable } from '@/components/CallsTable'
import { FilterBar } from '@/components/FilterBar'
import { DEFAULT_INTERNAL_USERS } from '@/lib/constants'

interface Call {
  call_id: string
  user_id: string
  is_new_user: boolean
  is_user_initiated: boolean
  initiated_at: string
  duration_seconds: number | null
  status: string
  total_turns: number
  language: string
}

export default function CallsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [callType, setCallType] = useState<'all' | 'welcome' | 'daily'>('all')
  const [excludeInternalUsers, setExcludeInternalUsers] = useState(true)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 50

  useEffect(() => {
    fetchCalls()
  }, [dateRange, callType, excludeInternalUsers, page])

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const excludeUsers = excludeInternalUsers ? DEFAULT_INTERNAL_USERS.join(',') : ''

      const res = await fetch(
        `/api/calls?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&callType=${callType}&excludeUsers=${excludeUsers}&limit=${pageSize}&offset=${page * pageSize}`
      )
      const data = await res.json()
      setCalls(data.calls || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Calls</h1>
          <p className="text-gray-500 text-sm mt-1">
            Browse and search through all voice calls
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => { setDateRange({ ...dateRange, startDate: e.target.value }); setPage(0); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => { setDateRange({ ...dateRange, endDate: e.target.value }); setPage(0); }}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <FilterBar
          callType={callType}
          onCallTypeChange={(t) => { setCallType(t); setPage(0); }}
          excludeInternalUsers={excludeInternalUsers}
          onExcludeInternalUsersChange={(e) => { setExcludeInternalUsers(e); setPage(0); }}
        />
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {dateRange.startDate === dateRange.endDate
            ? format(new Date(dateRange.startDate + 'T00:00:00'), 'MMMM d, yyyy')
            : `${format(new Date(dateRange.startDate + 'T00:00:00'), 'MMM d')} - ${format(new Date(dateRange.endDate + 'T00:00:00'), 'MMM d, yyyy')}`
          }
        </h2>
        <span className="text-sm text-gray-500">
          {total} calls total
          {totalPages > 1 && ` • Page ${page + 1} of ${totalPages}`}
        </span>
      </div>

      {/* Calls Table */}
      <CallsTable calls={calls} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={`px-4 py-2 text-sm rounded-lg border ${
              page === 0
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className={`px-4 py-2 text-sm rounded-lg border ${
              page >= totalPages - 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
