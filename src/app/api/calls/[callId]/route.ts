import { NextRequest, NextResponse } from 'next/server'
import { clickhouse } from '@/lib/clickhouse'

export async function GET(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  const callId = params.callId

  try {
    const query = `
      SELECT *
      FROM analytics.voice_call_analytics
      WHERE call_id = '${callId}'
      LIMIT 1
    `

    const result = await clickhouse.query({
      query,
      format: 'JSONEachRow',
    })

    const calls = await result.json() as any[]

    if (calls.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    return NextResponse.json({ call: calls[0] })
  } catch (error) {
    console.error('Error fetching call:', error)
    return NextResponse.json({ error: 'Failed to fetch call' }, { status: 500 })
  }
}
