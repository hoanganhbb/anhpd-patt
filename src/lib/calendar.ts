import type { Issue } from '@/services/types'

// Local-time YYYY-MM-DD, used as the key of a calendar day.
export const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 6 weeks x 7 days covering the month, weeks start on Monday.
export const buildMonthGrid = (year: number, month: number) => {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i))
}

// An issue sits on its due date, or on its creation date when it has none.
export const issueDate = (issue: Issue) => {
  const raw = issue.due_date || issue.created_at
  return raw ? new Date(raw) : null
}

export const groupByDay = (issues: Issue[]) => {
  const map = new Map<string, Issue[]>()
  for (const issue of issues) {
    const date = issueDate(issue)
    if (!date || Number.isNaN(date.getTime())) continue
    const key = toDateKey(date)
    map.set(key, [...(map.get(key) ?? []), issue])
  }
  return map
}

export const isResolved = (issue: Issue) => (issue.status?.id ?? 0) >= 80

export const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
