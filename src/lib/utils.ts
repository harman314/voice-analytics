import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns'

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return '-'
  try {
    const date = parseISO(isoString)
    return format(date, 'HH:mm:ss')
  } catch {
    return isoString
  }
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return '-'
  try {
    const date = parseISO(isoString)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    const daysAgo = differenceInDays(new Date(), date)
    if (daysAgo < 7) return `${daysAgo} days ago`
    return format(date, 'MMM d, yyyy')
  } catch {
    return isoString
  }
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-'
  try {
    const date = parseISO(isoString)
    return format(date, 'MMM d, yyyy HH:mm:ss')
  } catch {
    return isoString
  }
}

export function classifyLag(latency: number, threshold: number): 'normal' | 'warning' | 'critical' {
  if (latency <= threshold) return 'normal'
  if (latency <= threshold * 1.5) return 'warning'
  return 'critical'
}

export function truncateUserId(userId: string): string {
  if (userId.length <= 8) return userId
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`
}

export function parseTranscriptSafe(transcriptJson: string): { items: any[] } {
  try {
    const parsed = JSON.parse(transcriptJson)
    return parsed && parsed.items ? parsed : { items: [] }
  } catch {
    return { items: [] }
  }
}
