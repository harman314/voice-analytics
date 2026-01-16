// Lag thresholds (in seconds)
export const LAG_THRESHOLDS = {
  e2e_latency: 4.0,      // End-to-end latency > 4s is significant
  llm_ttft: 3.0,         // LLM time-to-first-token > 3s
  tts_ttfb: 0.5,         // TTS time-to-first-byte > 0.5s
  transcription_delay: 1.5, // Transcription delay > 1.5s
  end_of_turn: 2.0,      // End of turn detection > 2s
}

// Component latency breakdown labels and colors
export const LATENCY_COMPONENTS = {
  stt: { label: 'STT', color: 'bg-blue-500', description: 'Speech-to-Text transcription' },
  llm: { label: 'LLM', color: 'bg-purple-500', description: 'LLM processing time to first token' },
  tts: { label: 'TTS', color: 'bg-green-500', description: 'Text-to-Speech generation' },
  other: { label: 'Other', color: 'bg-gray-400', description: 'Network, VAD, pipeline overhead' },
}

// Default internal users - prepopulated from analytics project
// High call count users likely to be internal/test accounts
export const DEFAULT_INTERNAL_USERS = [
  '6960e1af8d4fd6300c99a511', // 46 calls - likely test account
  '6866164afb3e2073a0e5f888', // Known internal user
  '682fbc56a0cdf51b0bd556d3', // Known internal user
]
