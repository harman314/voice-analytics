import { NextRequest, NextResponse } from 'next/server'
import { clickhouse } from '@/lib/clickhouse'
import { LAG_THRESHOLDS } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Interface for component-level latency stats
interface ComponentLatencyStats {
  stt: { sum: number; count: number; values: number[] }
  llm: { sum: number; count: number; values: number[] }
  tts: { sum: number; count: number; values: number[] }
  e2e: { sum: number; count: number; values: number[] }
  endOfTurn: { sum: number; count: number; values: number[] }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
  const excludeUsers = searchParams.get('excludeUsers')?.split(',').filter(Boolean) || []

  try {
    let whereClause = `
      toDate(parseDateTimeBestEffort(initiated_at)) >= '${startDate}'
      AND toDate(parseDateTimeBestEffort(initiated_at)) <= '${endDate}'
    `

    if (excludeUsers.length > 0) {
      const excludeList = excludeUsers.map(u => `'${u}'`).join(',')
      whereClause += ` AND user_id NOT IN (${excludeList})`
    }

    // Get all calls with transcripts to analyze lag
    const query = `
      SELECT
        call_id,
        user_id,
        initiated_at,
        duration_seconds,
        transcript,
        status,
        language,
        is_user_initiated
      FROM analytics.voice_call_analytics
      WHERE ${whereClause}
        AND length(transcript) > 10
      ORDER BY initiated_at DESC
      LIMIT 500
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow',
    })
    const calls = await result.json() as any[]

    // Analyze lag episodes from transcripts
    const lagEpisodes: any[] = []
    const dailyLagStats: Record<string, {
      date: string
      high_latency_count: number
      avg_e2e_latency: number
      max_e2e_latency: number
      dropoff_count: number
      // Component latency aggregates
      stt_sum: number
      stt_count: number
      llm_sum: number
      llm_count: number
      tts_sum: number
      tts_count: number
    }> = {}

    // Component-level latency tracking
    const componentStats: ComponentLatencyStats = {
      stt: { sum: 0, count: 0, values: [] },
      llm: { sum: 0, count: 0, values: [] },
      tts: { sum: 0, count: 0, values: [] },
      e2e: { sum: 0, count: 0, values: [] },
      endOfTurn: { sum: 0, count: 0, values: [] },
    }

    // Per-language component stats
    const languageStats: Record<string, ComponentLatencyStats> = {}

    for (const call of calls) {
      try {
        const transcript = JSON.parse(call.transcript || '{}')
        const items = transcript.items || []
        const callDate = call.initiated_at?.split('T')[0] || 'unknown'
        const language = call.language || 'unknown'

        if (!dailyLagStats[callDate]) {
          dailyLagStats[callDate] = {
            date: callDate,
            high_latency_count: 0,
            avg_e2e_latency: 0,
            max_e2e_latency: 0,
            dropoff_count: 0,
            stt_sum: 0,
            stt_count: 0,
            llm_sum: 0,
            llm_count: 0,
            tts_sum: 0,
            tts_count: 0,
          }
        }

        // Initialize language stats if not exists
        if (!languageStats[language]) {
          languageStats[language] = {
            stt: { sum: 0, count: 0, values: [] },
            llm: { sum: 0, count: 0, values: [] },
            tts: { sum: 0, count: 0, values: [] },
            e2e: { sum: 0, count: 0, values: [] },
            endOfTurn: { sum: 0, count: 0, values: [] },
          }
        }

        let latencySum = 0
        let latencyCount = 0

        for (const item of items) {
          if (item.metrics) {
            const metrics = item.metrics
            const role = item.role

            // Collect STT metrics (from user turns)
            if (role === 'user' && metrics.transcription_delay && metrics.transcription_delay > 0) {
              componentStats.stt.sum += metrics.transcription_delay
              componentStats.stt.count++
              componentStats.stt.values.push(metrics.transcription_delay)
              languageStats[language].stt.sum += metrics.transcription_delay
              languageStats[language].stt.count++
              languageStats[language].stt.values.push(metrics.transcription_delay)
              // Daily stats - accumulate for avg
              dailyLagStats[callDate].stt_sum += metrics.transcription_delay
              dailyLagStats[callDate].stt_count++

              // Check STT threshold
              if (metrics.transcription_delay > LAG_THRESHOLDS.transcription_delay) {
                lagEpisodes.push({
                  call_id: call.call_id,
                  user_id: call.user_id,
                  timestamp: call.initiated_at,
                  item_id: item.id,
                  lag_type: 'stt',
                  lag_value: metrics.transcription_delay,
                  threshold: LAG_THRESHOLDS.transcription_delay,
                  is_user_initiated: call.is_user_initiated,
                })
              }
            }

            // Collect end-of-turn metrics (from user turns)
            if (role === 'user' && metrics.end_of_turn_delay && metrics.end_of_turn_delay > 0) {
              componentStats.endOfTurn.sum += metrics.end_of_turn_delay
              componentStats.endOfTurn.count++
              componentStats.endOfTurn.values.push(metrics.end_of_turn_delay)
              languageStats[language].endOfTurn.sum += metrics.end_of_turn_delay
              languageStats[language].endOfTurn.count++
              languageStats[language].endOfTurn.values.push(metrics.end_of_turn_delay)

              // Check end-of-turn threshold
              if (metrics.end_of_turn_delay > LAG_THRESHOLDS.end_of_turn) {
                lagEpisodes.push({
                  call_id: call.call_id,
                  user_id: call.user_id,
                  timestamp: call.initiated_at,
                  item_id: item.id,
                  lag_type: 'end_of_turn',
                  lag_value: metrics.end_of_turn_delay,
                  threshold: LAG_THRESHOLDS.end_of_turn,
                  is_user_initiated: call.is_user_initiated,
                })
              }
            }

            // Collect LLM metrics (from assistant turns)
            if (role === 'assistant' && metrics.llm_node_ttft && metrics.llm_node_ttft > 0) {
              componentStats.llm.sum += metrics.llm_node_ttft
              componentStats.llm.count++
              componentStats.llm.values.push(metrics.llm_node_ttft)
              languageStats[language].llm.sum += metrics.llm_node_ttft
              languageStats[language].llm.count++
              languageStats[language].llm.values.push(metrics.llm_node_ttft)
              // Daily stats - accumulate for avg
              dailyLagStats[callDate].llm_sum += metrics.llm_node_ttft
              dailyLagStats[callDate].llm_count++

              // Check LLM TTFT threshold
              if (metrics.llm_node_ttft > LAG_THRESHOLDS.llm_ttft) {
                lagEpisodes.push({
                  call_id: call.call_id,
                  user_id: call.user_id,
                  timestamp: call.initiated_at,
                  item_id: item.id,
                  lag_type: 'llm_ttft',
                  lag_value: metrics.llm_node_ttft,
                  threshold: LAG_THRESHOLDS.llm_ttft,
                  is_user_initiated: call.is_user_initiated,
                })
              }
            }

            // Collect TTS metrics (from assistant turns)
            if (role === 'assistant' && metrics.tts_node_ttfb && metrics.tts_node_ttfb > 0) {
              componentStats.tts.sum += metrics.tts_node_ttfb
              componentStats.tts.count++
              componentStats.tts.values.push(metrics.tts_node_ttfb)
              languageStats[language].tts.sum += metrics.tts_node_ttfb
              languageStats[language].tts.count++
              languageStats[language].tts.values.push(metrics.tts_node_ttfb)
              // Daily stats - accumulate for avg
              dailyLagStats[callDate].tts_sum += metrics.tts_node_ttfb
              dailyLagStats[callDate].tts_count++

              // Check TTS TTFB threshold
              if (metrics.tts_node_ttfb > LAG_THRESHOLDS.tts_ttfb) {
                lagEpisodes.push({
                  call_id: call.call_id,
                  user_id: call.user_id,
                  timestamp: call.initiated_at,
                  item_id: item.id,
                  lag_type: 'tts_ttfb',
                  lag_value: metrics.tts_node_ttfb,
                  threshold: LAG_THRESHOLDS.tts_ttfb,
                  is_user_initiated: call.is_user_initiated,
                })
              }
            }

            // Collect E2E latency (from assistant turns)
            if (metrics.e2e_latency && metrics.e2e_latency > 0) {
              componentStats.e2e.sum += metrics.e2e_latency
              componentStats.e2e.count++
              componentStats.e2e.values.push(metrics.e2e_latency)
              languageStats[language].e2e.sum += metrics.e2e_latency
              languageStats[language].e2e.count++
              languageStats[language].e2e.values.push(metrics.e2e_latency)

              latencySum += metrics.e2e_latency
              latencyCount++
              if (metrics.e2e_latency > dailyLagStats[callDate].max_e2e_latency) {
                dailyLagStats[callDate].max_e2e_latency = metrics.e2e_latency
              }

              // Check e2e latency threshold
              if (metrics.e2e_latency > LAG_THRESHOLDS.e2e_latency) {
                lagEpisodes.push({
                  call_id: call.call_id,
                  user_id: call.user_id,
                  timestamp: call.initiated_at,
                  item_id: item.id,
                  lag_type: 'e2e_latency',
                  lag_value: metrics.e2e_latency,
                  threshold: LAG_THRESHOLDS.e2e_latency,
                  is_user_initiated: call.is_user_initiated,
                })
                dailyLagStats[callDate].high_latency_count++
              }
            }
          }
        }

        if (latencyCount > 0) {
          dailyLagStats[callDate].avg_e2e_latency =
            (dailyLagStats[callDate].avg_e2e_latency + latencySum / latencyCount) / 2
        }

        // Check for dropoffs (short calls with low turns)
        if (call.duration_seconds && call.duration_seconds < 30 && items.length < 5) {
          dailyLagStats[callDate].dropoff_count++
        }

      } catch (e) {
        // Skip calls with invalid transcript JSON
      }
    }

    const dailyStats = Object.values(dailyLagStats)
      .map(stat => ({
        date: stat.date,
        high_latency_count: stat.high_latency_count,
        avg_e2e_latency: stat.avg_e2e_latency,
        max_e2e_latency: stat.max_e2e_latency,
        dropoff_count: stat.dropoff_count,
        // Avg component latencies
        avg_stt: stat.stt_count > 0 ? stat.stt_sum / stat.stt_count : 0,
        avg_llm: stat.llm_count > 0 ? stat.llm_sum / stat.llm_count : 0,
        avg_tts: stat.tts_count > 0 ? stat.tts_sum / stat.tts_count : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Calculate component breakdown summary
    const formatComponentStats = (stats: ComponentLatencyStats) => {
      const avgE2E = stats.e2e.count > 0 ? stats.e2e.sum / stats.e2e.count : 0
      const avgLLM = stats.llm.count > 0 ? stats.llm.sum / stats.llm.count : 0
      const avgTTS = stats.tts.count > 0 ? stats.tts.sum / stats.tts.count : 0
      const avgSTT = stats.stt.count > 0 ? stats.stt.sum / stats.stt.count : 0
      const avgEndOfTurn = stats.endOfTurn.count > 0 ? stats.endOfTurn.sum / stats.endOfTurn.count : 0
      const avgOther = avgE2E > 0 ? Math.max(0, avgE2E - avgLLM - avgTTS) : 0

      return {
        stt: {
          avg: avgSTT,
          p50: calculatePercentile(stats.stt.values, 50),
          p95: calculatePercentile(stats.stt.values, 95),
          count: stats.stt.count,
        },
        llm: {
          avg: avgLLM,
          p50: calculatePercentile(stats.llm.values, 50),
          p95: calculatePercentile(stats.llm.values, 95),
          count: stats.llm.count,
          pctOfE2E: avgE2E > 0 ? (avgLLM / avgE2E) * 100 : 0,
        },
        tts: {
          avg: avgTTS,
          p50: calculatePercentile(stats.tts.values, 50),
          p95: calculatePercentile(stats.tts.values, 95),
          count: stats.tts.count,
          pctOfE2E: avgE2E > 0 ? (avgTTS / avgE2E) * 100 : 0,
        },
        e2e: {
          avg: avgE2E,
          p50: calculatePercentile(stats.e2e.values, 50),
          p95: calculatePercentile(stats.e2e.values, 95),
          count: stats.e2e.count,
        },
        endOfTurn: {
          avg: avgEndOfTurn,
          p50: calculatePercentile(stats.endOfTurn.values, 50),
          p95: calculatePercentile(stats.endOfTurn.values, 95),
          count: stats.endOfTurn.count,
        },
        other: {
          avg: avgOther,
          pctOfE2E: avgE2E > 0 ? (avgOther / avgE2E) * 100 : 0,
        },
      }
    }

    // Format per-language stats
    const formattedLanguageStats: Record<string, ReturnType<typeof formatComponentStats>> = {}
    for (const [lang, stats] of Object.entries(languageStats)) {
      formattedLanguageStats[lang] = formatComponentStats(stats)
    }

    return NextResponse.json({
      lagEpisodes: lagEpisodes.slice(0, 100), // Limit to 100 most recent
      dailyStats,
      thresholds: LAG_THRESHOLDS,
      dateRange: { startDate, endDate },
      // New component breakdown data
      componentBreakdown: formatComponentStats(componentStats),
      languageBreakdown: formattedLanguageStats,
    })
  } catch (error) {
    console.error('Error fetching lag analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch lag analytics' }, { status: 500 })
  }
}
