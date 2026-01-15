import { createClient } from '@clickhouse/client'

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
})

export interface VoiceCall {
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
  _timestamp: string
}

export interface TranscriptItem {
  id: string
  type: 'message' | 'function_call' | 'function_call_output' | 'agent_handoff'
  role?: 'user' | 'assistant'
  content?: string[]
  name?: string
  arguments?: string
  output?: string
  metrics?: {
    tts_node_ttfb?: number
    llm_node_ttft?: number
    started_speaking_at?: number
    stopped_speaking_at?: number
    e2e_latency?: number
    transcription_delay?: number
    end_of_turn_delay?: number
  }
  interrupted?: boolean
  transcript_confidence?: number
}

export interface ParsedTranscript {
  items: TranscriptItem[]
}

export interface DailyMetrics {
  date: string
  total_calls: number
  welcome_calls: number
  daily_calls: number
  completed_calls: number
  avg_duration: number
  total_duration: number
  unique_users: number
}

export interface LagEpisode {
  call_id: string
  user_id: string
  timestamp: string
  item_id: string
  lag_type: 'e2e_latency' | 'llm_ttft' | 'tts_ttfb' | 'transcription_delay'
  lag_value: number
  threshold: number
}

// Lag thresholds (in seconds)
export const LAG_THRESHOLDS = {
  e2e_latency: 4.0,      // End-to-end latency > 4s is significant
  llm_ttft: 3.0,         // LLM time-to-first-token > 3s
  tts_ttfb: 0.5,         // TTS time-to-first-byte > 0.5s
  transcription_delay: 1.5, // Transcription delay > 1.5s
}

// Default internal users - prepopulated from analytics project
// High call count users likely to be internal/test accounts
export const DEFAULT_INTERNAL_USERS = [
  '6960e1af8d4fd6300c99a511', // 46 calls - likely test account
  '6866164afb3e2073a0e5f888', // Known internal user
  '682fbc56a0cdf51b0bd556d3', // Known internal user
]
