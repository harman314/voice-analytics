'use client'

import { parseTranscriptSafe, classifyLag } from '@/lib/utils'
import { LAG_THRESHOLDS } from '@/lib/constants'

interface TranscriptViewerProps {
  transcriptJson: string
}

export function TranscriptViewer({ transcriptJson }: TranscriptViewerProps) {
  const transcript = parseTranscriptSafe(transcriptJson)
  const items = transcript.items || []

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        No transcript available for this call
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item: any, index: number) => {
        // Handle agent handoffs
        if (item.type === 'agent_handoff') {
          return (
            <div
              key={item.id || index}
              className="text-center py-2 text-xs text-gray-400"
            >
              <span className="bg-gray-100 px-3 py-1 rounded-full">
                🔄 Handoff to {item.new_agent_id}
              </span>
            </div>
          )
        }

        // Handle function calls
        if (item.type === 'function_call') {
          return (
            <div
              key={item.id || index}
              className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-700">
                  🔧 Function: {item.name}
                </span>
              </div>
              {item.arguments && (
                <pre className="mt-2 text-xs text-amber-600 overflow-x-auto">
                  {formatJson(item.arguments)}
                </pre>
              )}
            </div>
          )
        }

        // Handle function call outputs
        if (item.type === 'function_call_output') {
          return (
            <div
              key={item.id || index}
              className="bg-emerald-50 border-l-4 border-emerald-400 p-3 rounded-r-lg"
            >
              <div className="text-xs font-medium text-emerald-700">
                ✓ {item.name} output
              </div>
              <div className="mt-1 text-sm text-emerald-600">
                {item.output}
              </div>
            </div>
          )
        }

        // Handle messages
        if (item.type === 'message') {
          const isUser = item.role === 'user'
          const content = Array.isArray(item.content)
            ? item.content.join('\n')
            : item.content || ''

          // Calculate lag classification
          const metrics = item.metrics || {}
          let lagClass = 'normal'
          let lagInfo: string[] = []

          if (metrics.e2e_latency) {
            const classification = classifyLag(metrics.e2e_latency, LAG_THRESHOLDS.e2e_latency)
            if (classification !== 'normal') {
              lagClass = classification
              lagInfo.push(`E2E: ${metrics.e2e_latency.toFixed(2)}s`)
            }
          }

          if (metrics.llm_node_ttft) {
            const classification = classifyLag(metrics.llm_node_ttft, LAG_THRESHOLDS.llm_ttft)
            if (classification === 'critical' || (classification === 'warning' && lagClass === 'normal')) {
              lagClass = classification
            }
            if (classification !== 'normal') {
              lagInfo.push(`LLM TTFT: ${metrics.llm_node_ttft.toFixed(2)}s`)
            }
          }

          if (metrics.transcription_delay) {
            const classification = classifyLag(metrics.transcription_delay, LAG_THRESHOLDS.transcription_delay)
            if (classification === 'critical' || (classification === 'warning' && lagClass === 'normal')) {
              lagClass = classification
            }
            if (classification !== 'normal') {
              lagInfo.push(`STT: ${metrics.transcription_delay.toFixed(2)}s`)
            }
          }

          const bgClass = lagClass === 'critical'
            ? 'bg-red-50 border-l-4 border-red-400'
            : lagClass === 'warning'
            ? 'bg-yellow-50 border-l-4 border-yellow-400'
            : isUser
            ? 'bg-blue-50 border-l-4 border-blue-400'
            : 'bg-gray-50 border-l-4 border-gray-300'

          return (
            <div
              key={item.id || index}
              className={`p-4 rounded-r-lg ${bgClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold ${
                    isUser ? 'text-blue-700' : 'text-gray-600'
                  }`}
                >
                  {isUser ? '👤 User' : '🤖 Assistant'}
                  {item.interrupted && (
                    <span className="ml-2 text-orange-500">(interrupted)</span>
                  )}
                </span>
                {lagInfo.length > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      lagClass === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    ⚠️ {lagInfo.join(' | ')}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {content}
              </div>
              {metrics.e2e_latency && lagClass === 'normal' && (
                <div className="mt-2 text-xs text-gray-400">
                  Latency: {metrics.e2e_latency.toFixed(2)}s
                </div>
              )}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

function formatJson(jsonStr: string): string {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2)
  } catch {
    return jsonStr
  }
}
