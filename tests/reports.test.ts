import { describe, expect, it } from 'vitest'

import {
  byHandler,
  byProject,
  countByGroup,
  dailyCreated,
  formatDuration,
  groupIssues,
  median,
  needsAttention,
  resolutionHours,
  UNASSIGNED
} from '@/lib/reports'
import type { Issue } from '@/services/types'

const issue = (id: number, status: number, handler?: number, project = 1): Issue => ({
  id,
  summary: String(id),
  status: { id: status, name: String(status) },
  handler: handler ? { id: handler, name: `u${handler}`, real_name: `User ${handler}` } : undefined,
  project: { id: project, name: `Project ${project}` }
})

const issues = [
  issue(1, 10, 7),
  issue(2, 50, 7),
  issue(3, 80, 7, 2),
  issue(4, 90, 8, 2),
  issue(5, 20, undefined, 2)
]

describe('reports', () => {
  it('groups by handler, split by status, largest first', () => {
    expect(groupIssues(issues, byHandler)).toEqual([
      { key: '7', label: 'User 7', total: 3, counts: { open: 2, resolved: 1, closed: 0 } },
      { key: '0', label: UNASSIGNED, total: 1, counts: { open: 1, resolved: 0, closed: 0 } },
      { key: '8', label: 'User 8', total: 1, counts: { open: 0, resolved: 0, closed: 1 } }
    ])
  })

  it('groups by project', () => {
    expect(groupIssues(issues, byProject).map(r => [r.label, r.total])).toEqual([
      ['Project 2', 3],
      ['Project 1', 2]
    ])
  })

  it('counts status groups', () => {
    expect(countByGroup(issues)).toEqual({ open: 3, resolved: 1, closed: 1 })
  })

  it('counts created issues per day, including empty days', () => {
    const now = new Date('2026-10-03T12:00:00').getTime()
    const rows = dailyCreated(
      [
        { ...issue(1, 10), created_at: '2026-10-03T08:00:00' },
        { ...issue(2, 90), created_at: '2026-10-01T08:00:00' },
        { ...issue(3, 80), created_at: '2026-10-01T09:00:00' },
        { ...issue(4, 10), created_at: '2026-09-01T09:00:00' }
      ],
      3,
      now
    )
    expect(rows.map(r => [r.date, r.total])).toEqual([
      ['2026-10-01', 2],
      ['2026-10-02', 0],
      ['2026-10-03', 1]
    ])
    expect(rows[0].counts).toEqual({ open: 0, resolved: 1, closed: 1 })
  })

  it('measures resolution time from the status history', () => {
    const resolved: Issue = {
      ...issue(1, 80),
      created_at: '2026-10-01T08:00:00Z',
      history: [
        { created_at: '2026-10-01T09:00:00Z', field: { name: 'status' }, new_value: { id: 50 } },
        { created_at: '2026-10-01T14:00:00Z', field: { name: 'status' }, new_value: { id: 80 } }
      ]
    }
    expect(resolutionHours(resolved)).toBe(6)
    expect(resolutionHours(issue(2, 10))).toBeUndefined()
    expect(median([5, 1, 3])).toBe(3)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(formatDuration(6)).toBe('6 giờ')
    expect(formatDuration(0.25)).toBe('15 phút')
  })

  it('lists overdue issues first, then the oldest open ones', () => {
    const now = new Date('2026-10-03T12:00:00Z').getTime()
    const list = needsAttention(
      [
        { ...issue(1, 10), created_at: '2026-09-01T00:00:00Z' },
        { ...issue(2, 10), created_at: '2026-10-01T00:00:00Z', due_date: '2026-10-02T00:00:00Z' },
        { ...issue(3, 90), created_at: '2026-08-01T00:00:00Z', due_date: '2026-09-01T00:00:00Z' },
        { ...issue(4, 30), created_at: '2026-09-15T00:00:00Z' }
      ],
      now,
      3
    )
    expect(list.map(i => i.id)).toEqual([2, 1, 4])
  })
})
