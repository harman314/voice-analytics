import { NextRequest, NextResponse } from 'next/server'
import { clickhouse, LAG_THRESHOLDS } from '@/lib/clickhouse'

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
        status
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
    }> = {}

    for (const call of calls) {
      try {
        const transcript = JSON.parse(call.transcript || '{}')
        const items = transcript.items || []
        const callDate = call.initiated_at?.split('T')[0] || 'unknown'

        if (!dailyLagStats[callDate]) {
          dailyLagStats[callDate] = {
            date: callDate,
            high_latency_count: 0,
            avg_e2e_latency: 0,
            max_e2e_latency: 0,
            dropoff_count: 0,
          }
        }

        let latencySum = 0
        let latencyCount = 0

        for (const item of items) {
          if (item.metrics) {
            const metrics = item.metrics

            // Check e2e latency
            if (metrics.e2e_latency && metrics.e2e_latency > LAG_THRESHOLDS.e2e_latency) {
              lagEpisodes.push({
                call_id: call.call_id,
                user_id: call.user_id,
                timestamp: call.initiated_at,
                item_id: item.id,
                lag_type: 'e2e_latency',
                lag_value: metrics.e2e_latency,
                threshold: LAG_THRESHOLDS.e2e_latency,
              })
              dailyLagStats[callDate].high_latency_count++
            }

            if (metrics.e2e_latency) {
              latencySum += metrics.e2e_latency
              latencyCount++
              if (metrics.e2e_latency > dailyLagStats[callDate].max_e2e_latency) {
                dailyLagStats[callDate].max_e2e_latency = metrics.e2e_latency
              }
            }

            // Check LLM TTFT
            if (metrics.llm_node_ttft && metrics.llm_node_ttft > LAG_THRESHOLDS.llm_ttft) {
              lagEpisodes.push({
                call_id: call.call_id,
                user_id: call.user_id,
                timestamp: call.initiated_at,
                item_id: item.id,
                lag_type: 'llm_ttft',
                lag_value: metrics.llm_node_ttft,
                threshold: LAG_THRESHOLDS.llm_ttft,
              })
            }

            // Check TTS TTFB
            if (metrics.tts_node_ttfb && metrics.tts_node_ttfb > LAG_THRESHOLDS.tts_ttfb) {
              lagEpisodes.push({
                call_id: call.call_id,
                user_id: call.user_id,
                timestamp: call.initiated_at,
                item_id: item.id,
                lag_type: 'tts_ttfb',
                lag_value: metrics.tts_node_ttfb,
                threshold: LAG_THRESHOLDS.tts_ttfb,
              })
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

    const dailyStats = Object.values(dailyLagStats).sort((a, b) =>
      b.date.localeCompare(a.date)
    )

    return NextResponse.json({
      lagEpisodes: lagEpisodes.slice(0, 100), // Limit to 100 most recent
      dailyStats,
      thresholds: LAG_THRESHOLDS,
      dateRange: { startDate, endDate },
    })
  } catch (error) {
    console.error('Error fetching lag analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch lag analytics' }, { status: 500 })
  }
}
