'use client'

import { LATENCY_COMPONENTS } from '@/lib/constants'

interface ComponentStats {
  avg: number
  p50: number
  p95: number
  count: number
  pctOfE2E?: number
}

interface LatencyBreakdownData {
  stt: ComponentStats
  llm: ComponentStats & { pctOfE2E: number }
  tts: ComponentStats & { pctOfE2E: number }
  e2e: ComponentStats
  endOfTurn: ComponentStats
  other: { avg: number; pctOfE2E: number }
}

interface LanguageBreakdown {
  [language: string]: LatencyBreakdownData
}

interface Props {
  componentBreakdown: LatencyBreakdownData | null
  languageBreakdown: LanguageBreakdown | null
}

const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'Hindi',
  en: 'English',
  te: 'Telugu',
  kn: 'Kannada',
  Hindi: 'Hindi',
  English: 'English',
  Telugu: 'Telugu',
}

export function LatencyBreakdown({ componentBreakdown, languageBreakdown }: Props) {
  if (!componentBreakdown) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
        No latency breakdown data available
      </div>
    )
  }

  const { stt, llm, tts, e2e, endOfTurn, other } = componentBreakdown

  // Calculate percentages for the bar
  const totalPct = llm.pctOfE2E + tts.pctOfE2E + other.pctOfE2E

  return (
    <div className="space-y-6">
      {/* Overall Component Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            🔬 Latency Component Breakdown
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Breaking down where time is spent in the voice pipeline
          </p>
        </div>

        <div className="p-4 space-y-6">
          {/* Visual Bar Chart */}
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium">
              E2E Latency Composition (avg: {(e2e.avg * 1000).toFixed(0)}ms)
            </div>
            <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
              {llm.pctOfE2E > 0 && (
                <div
                  className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${llm.pctOfE2E}%` }}
                  title={`LLM: ${llm.pctOfE2E.toFixed(1)}%`}
                >
                  {llm.pctOfE2E >= 15 && `LLM ${llm.pctOfE2E.toFixed(0)}%`}
                </div>
              )}
              {tts.pctOfE2E > 0 && (
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${tts.pctOfE2E}%` }}
                  title={`TTS: ${tts.pctOfE2E.toFixed(1)}%`}
                >
                  {tts.pctOfE2E >= 10 && `TTS ${tts.pctOfE2E.toFixed(0)}%`}
                </div>
              )}
              {other.pctOfE2E > 0 && (
                <div
                  className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${other.pctOfE2E}%` }}
                  title={`Other: ${other.pctOfE2E.toFixed(1)}%`}
                >
                  {other.pctOfE2E >= 15 && `Other ${other.pctOfE2E.toFixed(0)}%`}
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span className="text-gray-600">LLM</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-gray-600">TTS</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-400"></div>
                <span className="text-gray-600">Other (Network, VAD)</span>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* STT */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-semibold text-blue-800">STT (Speech-to-Text)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600">Avg:</span>
                  <span className="font-medium text-blue-900">{(stt.avg * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600">P50:</span>
                  <span className="font-medium text-blue-900">{(stt.p50 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600">P95:</span>
                  <span className="font-medium text-blue-900">{(stt.p95 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {stt.count.toLocaleString()} samples
                </div>
              </div>
            </div>

            {/* LLM */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-semibold text-purple-800">LLM (AI Processing)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-600">Avg:</span>
                  <span className="font-medium text-purple-900">{(llm.avg * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-600">P50:</span>
                  <span className="font-medium text-purple-900">{(llm.p50 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-600">P95:</span>
                  <span className="font-medium text-purple-900">{(llm.p95 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="text-xs text-purple-500 mt-1">
                  {llm.pctOfE2E.toFixed(1)}% of E2E
                </div>
              </div>
            </div>

            {/* TTS */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-semibold text-green-800">TTS (Text-to-Speech)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">Avg:</span>
                  <span className="font-medium text-green-900">{(tts.avg * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">P50:</span>
                  <span className="font-medium text-green-900">{(tts.p50 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">P95:</span>
                  <span className="font-medium text-green-900">{(tts.p95 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="text-xs text-green-500 mt-1">
                  {tts.pctOfE2E.toFixed(1)}% of E2E
                </div>
              </div>
            </div>

            {/* End of Turn */}
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-xs font-semibold text-orange-800">End of Turn (VAD)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600">Avg:</span>
                  <span className="font-medium text-orange-900">{(endOfTurn.avg * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600">P50:</span>
                  <span className="font-medium text-orange-900">{(endOfTurn.p50 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600">P95:</span>
                  <span className="font-medium text-orange-900">{(endOfTurn.p95 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="text-xs text-orange-500 mt-1">
                  {endOfTurn.count.toLocaleString()} samples
                </div>
              </div>
            </div>

            {/* E2E */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                <span className="text-xs font-semibold text-gray-800">Total E2E Latency</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Avg:</span>
                  <span className="font-medium text-gray-900">{(e2e.avg * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">P50:</span>
                  <span className="font-medium text-gray-900">{(e2e.p50 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">P95:</span>
                  <span className="font-medium text-gray-900">{(e2e.p95 * 1000).toFixed(0)}ms</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {e2e.count.toLocaleString()} samples
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <h4 className="text-sm font-semibold text-indigo-800 mb-2">💡 Key Insights</h4>
            <ul className="text-xs text-indigo-700 space-y-1">
              {llm.pctOfE2E > 40 && (
                <li>• <strong>LLM is the main bottleneck</strong> ({llm.pctOfE2E.toFixed(0)}% of E2E) - consider prompt optimization or model selection</li>
              )}
              {tts.pctOfE2E > 15 && (
                <li>• TTS is taking {tts.pctOfE2E.toFixed(0)}% of response time - consider streaming TTS or faster voices</li>
              )}
              {other.pctOfE2E > 30 && (
                <li>• <strong>Network/pipeline overhead is significant</strong> ({other.pctOfE2E.toFixed(0)}% of E2E) - check network latency and buffering</li>
              )}
              {endOfTurn.avg > 1.5 && (
                <li>• End-of-turn detection averages {(endOfTurn.avg * 1000).toFixed(0)}ms - tune VAD sensitivity</li>
              )}
              {stt.p95 > 1.2 && (
                <li>• STT P95 is {(stt.p95 * 1000).toFixed(0)}ms - consider audio quality or STT provider optimization</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Language Breakdown Table */}
      {languageBreakdown && Object.keys(languageBreakdown).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">
              🌐 Latency by Language
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT (avg)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LLM (avg)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TTS (avg)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E2E (avg)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LLM %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(languageBreakdown)
                  .sort((a, b) => b[1].e2e.count - a[1].e2e.count)
                  .map(([lang, stats]) => (
                    <tr key={lang} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {LANGUAGE_LABELS[lang] || lang}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(stats.stt.avg * 1000).toFixed(0)}ms
                      </td>
                      <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                        {(stats.llm.avg * 1000).toFixed(0)}ms
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600">
                        {(stats.tts.avg * 1000).toFixed(0)}ms
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {(stats.e2e.avg * 1000).toFixed(0)}ms
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${Math.min(100, stats.llm.pctOfE2E)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {stats.llm.pctOfE2E.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
