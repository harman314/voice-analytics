'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TranscriptViewer } from '@/components/TranscriptViewer'
import { formatDateTime, formatDuration, truncateUserId, parseTranscriptSafe } from '@/lib/utils'
import { LAG_THRESHOLDS } from '@/lib/constants'

interface CallDetail {
  call_id: string
  user_id: string
  call_type: string
  language: string
  agent_name: string
  is_new_user: boolean
  is_user_initiated: boolean
  initiated_at: string
  answered_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: string
  welcome_completed: boolean
  transcript: string
  total_turns: number
  usage_summary: string
  actions: string
  timezone: string
  scheduled_time: string | null
}

export default function CallDetailPage() {
  const params = useParams()
  const router = useRouter()
  const callId = params.callId as string

  const [call, setCall] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRawTranscript, setShowRawTranscript] = useState(false)

  useEffect(() => {
    fetchCall()
  }, [callId])

  const fetchCall = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calls/${callId}`)
      if (!res.ok) {
        throw new Error('Call not found')
      }
      const data = await res.json()
      setCall(data.call)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch call')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading call details...</div>
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">{error || 'Call not found'}</div>
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-700"
        >
          ← Go back
        </button>
      </div>
    )
  }

  // Parse usage summary
  const usageSummary = (() => {
    try {
      return JSON.parse(call.usage_summary || '{}')
    } catch {
      return {}
    }
  })()

  // Parse actions
  const actions = (() => {
    try {
      return JSON.parse(call.actions || '{}')
    } catch {
      return {}
    }
  })()

  // Calculate lag statistics from transcript
  const lagStats = calculateLagStats(call.transcript)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Details</h1>
            <p className="text-gray-500 text-sm font-mono">{truncateUserId(call.call_id)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              call.is_new_user
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {call.is_new_user ? '👋 Welcome Call' : '📅 Daily Call'}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              call.is_user_initiated
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {call.is_user_initiated ? '👤 User Initiated' : '🤖 System Initiated'}
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="User ID" value={truncateUserId(call.user_id)} mono />
        <InfoCard label="Duration" value={formatDuration(call.duration_seconds)} />
        <InfoCard label="Status" value={call.status} badge={call.status === 'completed' ? 'green' : 'red'} />
        <InfoCard label="Total Turns" value={call.total_turns.toString()} />
        <InfoCard label="Initiated At" value={formatDateTime(call.initiated_at)} />
        <InfoCard label="Language" value={call.language.toUpperCase()} />
        <InfoCard label="Timezone" value={call.timezone} />
        <InfoCard label="Scheduled" value={call.scheduled_time || '-'} />
      </div>

      {/* Lag Statistics */}
      {lagStats.totalMessages > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">⏱️ Latency Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Avg E2E Latency</div>
              <div className={`font-medium ${lagStats.avgE2E > LAG_THRESHOLDS.e2e_latency ? 'text-red-600' : 'text-gray-900'}`}>
                {lagStats.avgE2E.toFixed(2)}s
              </div>
            </div>
            <div>
              <div className="text-gray-500">Max E2E Latency</div>
              <div className={`font-medium ${lagStats.maxE2E > LAG_THRESHOLDS.e2e_latency ? 'text-red-600' : 'text-gray-900'}`}>
                {lagStats.maxE2E.toFixed(2)}s
              </div>
            </div>
            <div>
              <div className="text-gray-500">High Latency Events</div>
              <div className={`font-medium ${lagStats.highLatencyCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                {lagStats.highLatencyCount}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Critical Events</div>
              <div className={`font-medium ${lagStats.criticalCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {lagStats.criticalCount}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total Messages</div>
              <div className="font-medium text-gray-900">{lagStats.totalMessages}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions Summary */}
      {actions.mealsLogged && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🍽️ Meals Logged</h3>
          <div className="flex flex-wrap gap-2">
            {actions.mealsLogged.map((meal: string) => (
              <span
                key={meal}
                className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
              >
                ✓ {meal}
              </span>
            ))}
            {actions.mealsSkipped?.map((meal: string) => (
              <span
                key={meal}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm"
              >
                ⏭️ {meal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Usage Summary */}
      {Object.keys(usageSummary).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Usage Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {usageSummary.llm_prompt_tokens > 0 && (
              <div>
                <div className="text-gray-500">LLM Tokens</div>
                <div className="font-medium">
                  {usageSummary.llm_prompt_tokens.toLocaleString()} / {usageSummary.llm_completion_tokens?.toLocaleString() || 0}
                </div>
              </div>
            )}
            {usageSummary.stt_audio_duration > 0 && (
              <div>
                <div className="text-gray-500">STT Audio</div>
                <div className="font-medium">{usageSummary.stt_audio_duration.toFixed(1)}s</div>
              </div>
            )}
            {usageSummary.tts_audio_duration > 0 && (
              <div>
                <div className="text-gray-500">TTS Audio</div>
                <div className="font-medium">{usageSummary.tts_audio_duration.toFixed(1)}s</div>
              </div>
            )}
            {usageSummary.tts_characters_count > 0 && (
              <div>
                <div className="text-gray-500">TTS Characters</div>
                <div className="font-medium">{usageSummary.tts_characters_count.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">📝 Full Transcript</h3>
          <button
            onClick={() => setShowRawTranscript(!showRawTranscript)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showRawTranscript ? 'Show Formatted' : 'Show Raw JSON'}
          </button>
        </div>
        <div className="p-4 max-h-[800px] overflow-y-auto">
          {showRawTranscript ? (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded overflow-x-auto">
              {JSON.stringify(parseTranscriptSafe(call.transcript), null, 2)}
            </pre>
          ) : (
            <TranscriptViewer transcriptJson={call.transcript} />
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  mono,
  badge,
}: {
  label: string
  value: string
  mono?: boolean
  badge?: 'green' | 'red' | 'yellow'
}) {
  const badgeClass = badge === 'green'
    ? 'bg-green-100 text-green-700'
    : badge === 'red'
    ? 'bg-red-100 text-red-700'
    : badge === 'yellow'
    ? 'bg-yellow-100 text-yellow-700'
    : ''

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {badge ? (
        <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${badgeClass}`}>
          {value}
        </span>
      ) : (
        <div className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
      )}
    </div>
  )
}

function calculateLagStats(transcriptJson: string) {
  const stats = {
    totalMessages: 0,
    avgE2E: 0,
    maxE2E: 0,
    highLatencyCount: 0,
    criticalCount: 0,
  }

  try {
    const transcript = JSON.parse(transcriptJson || '{}')
    const items = transcript.items || []

    let e2eSum = 0
    let e2eCount = 0

    for (const item of items) {
      if (item.type === 'message' && item.role === 'assistant') {
        stats.totalMessages++

        if (item.metrics?.e2e_latency) {
          const latency = item.metrics.e2e_latency
          e2eSum += latency
          e2eCount++

          if (latency > stats.maxE2E) {
            stats.maxE2E = latency
          }

          if (latency > LAG_THRESHOLDS.e2e_latency) {
            stats.highLatencyCount++
          }

          if (latency > LAG_THRESHOLDS.e2e_latency * 1.5) {
            stats.criticalCount++
          }
        }
      }
    }

    if (e2eCount > 0) {
      stats.avgE2E = e2eSum / e2eCount
    }
  } catch {
    // Ignore parse errors
  }

  return stats
}
