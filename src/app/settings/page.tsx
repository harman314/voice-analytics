'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_INTERNAL_USERS, LAG_THRESHOLDS } from '@/lib/clickhouse'

export default function SettingsPage() {
  const [internalUsers, setInternalUsers] = useState<string[]>([])
  const [newUserId, setNewUserId] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem('voice-analytics-internal-users')
    if (stored) {
      try {
        setInternalUsers(JSON.parse(stored))
      } catch {
        setInternalUsers(DEFAULT_INTERNAL_USERS)
      }
    } else {
      setInternalUsers(DEFAULT_INTERNAL_USERS)
    }
  }, [])

  const handleAddUser = () => {
    const trimmed = newUserId.trim()
    if (trimmed && !internalUsers.includes(trimmed)) {
      const updated = [...internalUsers, trimmed]
      setInternalUsers(updated)
      localStorage.setItem('voice-analytics-internal-users', JSON.stringify(updated))
      setNewUserId('')
      showSaved()
    }
  }

  const handleRemoveUser = (userId: string) => {
    const updated = internalUsers.filter((u) => u !== userId)
    setInternalUsers(updated)
    localStorage.setItem('voice-analytics-internal-users', JSON.stringify(updated))
    showSaved()
  }

  const handleReset = () => {
    setInternalUsers(DEFAULT_INTERNAL_USERS)
    localStorage.setItem('voice-analytics-internal-users', JSON.stringify(DEFAULT_INTERNAL_USERS))
    showSaved()
  }

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure internal users and analytics thresholds
        </p>
      </div>

      {/* Saved indicator */}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
          ✓ Settings saved
        </div>
      )}

      {/* Internal Users Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">👤 Internal Users</h3>
          <p className="text-xs text-gray-500 mt-1">
            These user IDs will be excluded when the "Exclude internal users" filter is enabled
          </p>
        </div>
        <div className="p-4 space-y-4">
          {/* Add new user */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="Enter user ID (24 character hex)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
            />
            <button
              onClick={handleAddUser}
              disabled={!newUserId.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* User list */}
          <div className="space-y-2">
            {internalUsers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No internal users configured</p>
            ) : (
              internalUsers.map((userId) => (
                <div
                  key={userId}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <code className="text-sm font-mono text-gray-700">{userId}</code>
                  <button
                    onClick={() => handleRemoveUser(userId)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Reset button */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>

      {/* Lag Thresholds Section (Read-only) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">⏱️ Lag Thresholds</h3>
          <p className="text-xs text-gray-500 mt-1">
            Current thresholds for highlighting latency issues (configured in code)
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">E2E Latency</div>
              <div className="text-lg font-semibold text-gray-900">{LAG_THRESHOLDS.e2e_latency}s</div>
              <div className="text-xs text-gray-400">Full round-trip time</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">LLM Time-to-First-Token</div>
              <div className="text-lg font-semibold text-gray-900">{LAG_THRESHOLDS.llm_ttft}s</div>
              <div className="text-xs text-gray-400">AI response start</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">TTS Time-to-First-Byte</div>
              <div className="text-lg font-semibold text-gray-900">{LAG_THRESHOLDS.tts_ttfb}s</div>
              <div className="text-xs text-gray-400">Speech synthesis start</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Transcription Delay</div>
              <div className="text-lg font-semibold text-gray-900">{LAG_THRESHOLDS.transcription_delay}s</div>
              <div className="text-xs text-gray-400">Speech-to-text processing</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            To modify thresholds, update <code className="bg-gray-100 px-1 rounded">src/lib/clickhouse.ts</code>
          </p>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">ℹ️ About</h3>
        </div>
        <div className="p-4 space-y-2 text-sm text-gray-600">
          <p><strong>Voice Analytics v0.1.0</strong></p>
          <p>A module for analyzing TapHealth AI coaching voice calls.</p>
          <p>Data source: ClickHouse <code className="bg-gray-100 px-1 rounded">analytics.voice_call_analytics</code></p>
          <div className="pt-2">
            <a
              href="https://harman-taphealth.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700"
            >
              ← Back to PM Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
