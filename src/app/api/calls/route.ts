import { NextRequest, NextResponse } from 'next/server'
import { clickhouse } from '@/lib/clickhouse'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const callType = searchParams.get('callType') || 'all' // 'all', 'welcome', 'daily'
  const excludeUsers = searchParams.get('excludeUsers')?.split(',').filter(Boolean) || []
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    let whereClause = `toDate(parseDateTimeBestEffort(initiated_at)) = '${date}'`

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

    const calls = await result.json()

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

    return NextResponse.json({ calls, total, date })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
  }
}
