'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import { alpha } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import type { MouseEvent } from 'react'

import { statusColor } from '@/components/StatusChip'
import { buildMonthGrid, isResolved, isWeekend, toDateKey, WEEKDAYS } from '@/lib/calendar'
import type { Issue } from '@/services/types'

interface Props {
  year: number
  month: number
  issuesByDay: Map<string, Issue[]>
  selected: string
  onSelectDay: (key: string) => void
  onIssueClick: (event: MouseEvent<HTMLElement>, issue: Issue) => void
}

const MAX_VISIBLE = 3

export default function MonthCalendar({
  year,
  month,
  issuesByDay,
  selected,
  onSelectDay,
  onIssueClick
}: Props) {
  const days = buildMonthGrid(year, month)
  const today = toDateKey(new Date())

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      {WEEKDAYS.map((d, i) => (
        <Typography
          key={d}
          variant="caption"
          sx={{
            py: 1.25,
            textAlign: 'center',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: i >= 5 ? 'error.main' : 'text.secondary',
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          {d}
        </Typography>
      ))}
      {days.map((day, i) => {
        const key = toDateKey(day)
        const inMonth = day.getMonth() === month
        const items = issuesByDay.get(key) ?? []
        const open = items.filter(it => !isResolved(it)).length
        const weekend = isWeekend(day)
        const isSelected = key === selected && !weekend
        return (
          <Box
            key={key}
            onClick={weekend ? undefined : () => onSelectDay(key)}
            aria-disabled={weekend || undefined}
            sx={{
              position: 'relative',
              minHeight: { xs: 60, sm: 124 },
              p: 0.75,
              borderRight: (i + 1) % 7 ? 1 : 0,
              borderBottom: i < 35 ? 1 : 0,
              borderColor: 'divider',
              cursor: weekend ? 'default' : 'pointer',
              transition: 'background-color .15s',
              // Weekends are not working days: light red and not selectable.
              bgcolor: weekend
                ? t => t.alpha((t.vars || t).palette.error.main, 0.06)
                : isSelected
                  ? t => t.alpha((t.vars || t).palette.primary.main, 0.06)
                  : undefined,
              boxShadow: isSelected
                ? t => `inset 0 0 0 2px ${(t.vars || t).palette.primary.main}`
                : 'none',
              '&:hover': weekend
                ? {}
                : { bgcolor: t => t.alpha((t.vars || t).palette.primary.main, 0.04) },
              minWidth: 0
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                height: 24,
                px: 0.5,
                mb: 0.5,
                borderRadius: 999,
                fontWeight: key === today ? 700 : 500,
                bgcolor: key === today ? 'primary.main' : undefined,
                color:
                  key === today
                    ? 'primary.contrastText'
                    : !inMonth
                      ? 'text.disabled'
                      : weekend
                        ? 'error.main'
                        : 'text.primary'
              }}
            >
              {day.getDate()}
            </Typography>

            {/* Phones: just a count. */}
            {items.length > 0 && (
              <Typography
                variant="caption"
                sx={{
                  display: { xs: 'block', sm: 'none' },
                  fontWeight: 600,
                  color: open ? 'primary.main' : 'text.secondary'
                }}
              >
                {items.length}
              </Typography>
            )}

            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                flexDirection: 'column',
                gap: 0.5,
                opacity: inMonth ? 1 : 0.55
              }}
            >
              {items.slice(0, MAX_VISIBLE).map(issue => (
                <ButtonBase
                  key={issue.id}
                  onClick={e => {
                    e.stopPropagation()
                    onIssueClick(e, issue)
                  }}
                  title={`#${issue.id} ${issue.summary}`}
                  sx={{
                    display: 'block',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1.5,
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '18px',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'text.primary',
                    bgcolor: alpha(statusColor(issue.status), 0.12),
                    borderLeft: `3px solid ${statusColor(issue.status)}`,
                    textDecoration: isResolved(issue) ? 'line-through' : 'none',
                    opacity: isResolved(issue) ? 0.55 : 1,
                    transition: 'transform .12s, box-shadow .12s',
                    '&:hover': {
                      bgcolor: alpha(statusColor(issue.status), 0.2),
                      boxShadow: `0 2px 6px -2px ${alpha(statusColor(issue.status), 0.6)}`
                    }
                  }}
                >
                  {issue.summary}
                </ButtonBase>
              ))}
              {items.length > MAX_VISIBLE && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                  +{items.length - MAX_VISIBLE} việc khác
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
