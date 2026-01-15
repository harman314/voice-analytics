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

    // Daily metrics
    const dailyMetricsQuery = `
      SELECT
        toDate(parseDateTimeBestEffort(initiated_at)) as date,
        count(*) as total_calls,
        countIf(is_new_user = true) as welcome_calls,
        countIf(is_new_user = false) as daily_calls,
        countIf(status = 'completed') as completed_calls,
        avg(duration_seconds) as avg_duration,
        sum(duration_seconds) as total_duration,
        uniq(user_id) as unique_users
      FROM analytics.voice_call_analytics
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date DESC
    `

    const metricsResult = await clickhouse.query({
      query: dailyMetricsQuery,
      format: 'JSONEachRow',
    })
    const dailyMetrics = await metricsResult.json()

    // Summary stats
    const summaryQuery = `
      SELECT
        count(*) as total_calls,
        countIf(is_new_user = true) as welcome_calls,
        countIf(is_new_user = false) as daily_calls,
        countIf(status = 'completed') as completed_calls,
        avg(duration_seconds) as avg_duration,
        sum(duration_seconds) as total_duration,
        uniq(user_id) as unique_users,
        countIf(duration_seconds < 10) as short_calls,
        countIf(duration_seconds >= 60) as long_calls
      FROM analytics.voice_call_analytics
      WHERE ${whereClause}
    `

    const summaryResult = await clickhouse.query({
      query: summaryQuery,
      format: 'JSONEachRow',
    })
    const summaryData = await summaryResult.json() as any[]
    const summary = summaryData[0] || {}

    return NextResponse.json({
      dailyMetrics,
      summary,
      dateRange: { startDate, endDate },
      lagThresholds: LAG_THRESHOLDS,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
