import { NextRequest, NextResponse } from 'next/server'
import { clickhouse } from '@/lib/clickhouse'
import { LAG_THRESHOLDS } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper to analyze lag from transcript
function analyzeLag(transcriptJson: string): { maxLag: number; lagEpisodes: number; lagType: string | null } {
  try {
    const transcript = JSON.parse(transcriptJson || '{}')
    const items = transcript.items || []

    let maxLag = 0
    let lagEpisodes = 0
    let maxLagType: string | null = null

    for (const item of items) {
      if (item.metrics) {
        const metrics = item.metrics

        // Check e2e latency
        if (metrics.e2e_latency && metrics.e2e_latency > LAG_THRESHOLDS.e2e_latency) {
          lagEpisodes++
          if (metrics.e2e_latency > maxLag) {
            maxLag = metrics.e2e_latency
            maxLagType = 'e2e'
          }
        }

        // Check LLM TTFT
        if (metrics.llm_node_ttft && metrics.llm_node_ttft > LAG_THRESHOLDS.llm_ttft) {
          lagEpisodes++
          if (metrics.llm_node_ttft > maxLag) {
            maxLag = metrics.llm_node_ttft
            maxLagType = 'llm'
          }
        }

        // Check TTS TTFB (convert to comparable scale)
        if (metrics.tts_node_ttfb && metrics.tts_node_ttfb > LAG_THRESHOLDS.tts_ttfb) {
          lagEpisodes++
          // Don't update maxLag for TTS as it's a different scale
        }
      }
    }

    return { maxLag, lagEpisodes, lagType: maxLagType }
  } catch {
    return { maxLag: 0, lagEpisodes: 0, lagType: null }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  // Support both single date (legacy) and date range
  const startDate = searchParams.get('startDate') || searchParams.get('date') || new Date().toISOString().split('T')[0]
  const endDate = searchParams.get('endDate') || startDate
  const callType = searchParams.get('callType') || 'all' // 'all', 'welcome', 'daily'
  const excludeUsers = searchParams.get('excludeUsers')?.split(',').filter(Boolean) || []
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    let whereClause = `
      toDate(parseDateTimeBestEffort(initiated_at)) >= '${startDate}'
      AND toDate(parseDateTimeBestEffort(initiated_at)) <= '${endDate}'
    `

    if (callType === 'welcome') {
      whereClause += ` AND is_new_user = true`
    } else if (callType === 'daily') {
      whereClause += ` AND is_new_user = false`
    }

    if (excludeUsers.length > 0) {
      const excludeList = excludeUsers.map(u => `'${u}'`).join(',')
      whereClause += ` AND user_id NOT IN (${excludeList})`
    }

    const query = `
      SELECT
        call_id,
        user_id,
        call_type,
        language,
        agent_name,
        is_new_user,
        is_user_initiated,
        initiated_at,
        answered_at,
        ended_at,
        duration_seconds,
        status,
        welcome_completed,
        total_turns,
        timezone,
        scheduled_time,
        transcript,
        actions,
        _timestamp
      FROM analytics.voice_call_analytics
      WHERE ${whereClause}
      ORDER BY initiated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow',
    })

    const rawCalls = await result.json() as any[]

    // Process each call to add lag analysis and meals count
    const calls = rawCalls.map(call => {
      const lagData = analyzeLag(call.transcript)

      // Count meals logged from actions
      let mealsLogged = 0
      try {
        const actions = JSON.parse(call.actions || '{}')
        if (actions.mealsLogged && Array.isArray(actions.mealsLogged)) {
          mealsLogged = actions.mealsLogged.length
        }
      } catch {
        // Ignore parse errors
      }

      // Don't include full transcript or actions in response (too large)
      const { transcript, actions: _, ...callWithoutLargeFields } = call
      return {
        ...callWithoutLargeFields,
        max_lag: lagData.maxLag,
        lag_episodes: lagData.lagEpisodes,
        lag_type: lagData.lagType,
        meals_logged: mealsLogged,
      }
    })

    // Get total count
    const countQuery = `
      SELECT count(*) as total
      FROM analytics.voice_call_analytics
      WHERE ${whereClause}
    `
    const countResult = await clickhouse.query({
      query: countQuery,
      format: 'JSONEachRow',
    })
    const countData = await countResult.json() as { total: string }[]
    const total = parseInt(countData[0]?.total || '0')

    return NextResponse.json({ calls, total, startDate, endDate })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
  }
}
