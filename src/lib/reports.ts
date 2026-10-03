import type { Issue } from '@/services/types'

// Statuses folded into three groups so a stacked bar stays readable.
export type StatusGroup = 'open' | 'resolved' | 'closed'

// Validated categorical slots (CVD-safe on the light and dark panel surfaces); don't
// re-tint them by eye. The light aqua is under 3:1, so charts keep visible labels/tables.
export const STATUS_GROUPS: { key: StatusGroup; label: string; light: string; dark: string }[] = [
  { key: 'open', label: 'Đang mở', light: '#eb6834', dark: '#d95926' },
  { key: 'resolved', label: 'Đã xử lý', light: '#2a78d6', dark: '#3987e5' },
  { key: 'closed', label: 'Đã đóng', light: '#1baf7a', dark: '#199e70' }
]

export const statusGroup = (issue: Issue): StatusGroup => {
  const id = issue.status?.id ?? 0
  if (id >= 90) return 'closed'
  if (id >= 80) return 'resolved'
  return 'open'
}

export interface GroupRow {
  key: string
  label: string
  total: number
  counts: Record<StatusGroup, number>
}

const emptyCounts = (): Record<StatusGroup, number> => ({ open: 0, resolved: 0, closed: 0 })

// Count issues per key, split by status group, largest first.
export const groupIssues = (
  issues: Issue[],
  keyOf: (issue: Issue) => { key: string; label: string }
): GroupRow[] => {
  const rows = new Map<string, GroupRow>()
  for (const issue of issues) {
    const { key, label } = keyOf(issue)
    let row = rows.get(key)
    if (!row) rows.set(key, (row = { key, label, total: 0, counts: emptyCounts() }))
    row.total++
    row.counts[statusGroup(issue)]++
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

export const UNASSIGNED = 'Chưa giao'

export const byHandler = (issue: Issue) =>
  issue.handler
    ? { key: String(issue.handler.id), label: issue.handler.real_name || issue.handler.name }
    : { key: '0', label: UNASSIGNED }

export const byProject = (issue: Issue) =>
  issue.project
    ? { key: String(issue.project.id), label: issue.project.name }
    : { key: '0', label: 'Không rõ dự án' }

export const countByGroup = (issues: Issue[]) => {
  const counts = emptyCounts()
  for (const issue of issues) counts[statusGroup(issue)]++
  return counts
}

export const byPriority = (issue: Issue) =>
  issue.priority
    ? { key: issue.priority.name, label: issue.priority.label ?? issue.priority.name }
    : { key: '', label: 'Không rõ' }

export const byCategory = (issue: Issue) =>
  issue.category
    ? { key: issue.category.name, label: issue.category.name }
    : { key: '', label: 'Không rõ' }

const DAY = 24 * 3600 * 1000

// Local "YYYY-MM-DD" of a timestamp.
export const dayKey = (value: string | number | Date) => {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export interface DayRow {
  date: string
  total: number
  counts: Record<StatusGroup, number>
}

// Issues created per day over the `days` days ending at `now` (empty days included),
// split by the issue's current status group.
export const dailyCreated = (issues: Issue[], days: number, now: number): DayRow[] => {
  const rows = new Map<string, DayRow>()
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(now - i * DAY)
    rows.set(date, { date, total: 0, counts: emptyCounts() })
  }
  for (const issue of issues) {
    if (!issue.created_at) continue
    const row = rows.get(dayKey(issue.created_at))
    if (!row) continue
    row.total++
    row.counts[statusGroup(issue)]++
  }
  return [...rows.values()]
}

// Hours from creation to the first change into a resolved/closed status, from the issue
// history; undefined when the history has no such change.
export const resolutionHours = (issue: Issue) => {
  if (!issue.created_at) return undefined
  const done = issue.history?.find(h => h.field?.name === 'status' && (h.new_value?.id ?? 0) >= 80)
  if (!done) return undefined
  return (new Date(done.created_at).getTime() - new Date(issue.created_at).getTime()) / 3600000
}

export const median = (values: number[]) => {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// "3 giờ", "2,5 ngày"…
export const formatDuration = (hours?: number) => {
  if (hours === undefined) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} phút`
  if (hours < 48) return `${Math.round(hours)} giờ`
  return `${(hours / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ngày`
}

export const isOverdue = (issue: Issue, now: number) =>
  statusGroup(issue) === 'open' && !!issue.due_date && new Date(issue.due_date).getTime() < now

export const ageDays = (issue: Issue, now: number) =>
  issue.created_at ? Math.floor((now - new Date(issue.created_at).getTime()) / DAY) : 0

// Open issues that need attention: overdue first (most overdue first), then the oldest.
export const needsAttention = (issues: Issue[], now: number, limit: number) =>
  issues
    .filter(i => statusGroup(i) === 'open')
    .sort((a, b) => {
      const od = Number(isOverdue(b, now)) - Number(isOverdue(a, now))
      if (od) return od
      if (isOverdue(a, now)) return a.due_date!.localeCompare(b.due_date!)
      return (a.created_at ?? '').localeCompare(b.created_at ?? '')
    })
    .slice(0, limit)
