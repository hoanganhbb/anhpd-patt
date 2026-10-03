'use client'

import { Box, chakra, Flex, Grid, Text } from '@chakra-ui/react'
import type { MouseEvent } from 'react'

import { statusColor } from '@/components/StatusChip'
import { buildMonthGrid, isResolved, isWeekend, toDateKey, WEEKDAYS } from '@/lib/calendar'
import { alpha } from '@/lib/color'
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
    <Grid
      templateColumns="repeat(7, minmax(0, 1fr))"
      borderWidth="1px"
      borderRadius="l3"
      overflow="hidden"
      bg="bg.panel"
    >
      {WEEKDAYS.map((d, i) => (
        <Text
          key={d}
          textStyle="xs"
          py="2.5"
          textAlign="center"
          fontWeight="semibold"
          letterSpacing="0.06em"
          color={i >= 5 ? 'fg.subtle' : 'fg.muted'}
          bg="bg"
          borderBottomWidth="1px"
        >
          {d}
        </Text>
      ))}
      {days.map((day, i) => {
        const key = toDateKey(day)
        const inMonth = day.getMonth() === month
        const items = issuesByDay.get(key) ?? []
        const open = items.filter(it => !isResolved(it)).length
        const weekend = isWeekend(day)
        const isSelected = key === selected && !weekend
        const isToday = key === today
        return (
          <Box
            key={key}
            onClick={weekend ? undefined : () => onSelectDay(key)}
            aria-disabled={weekend || undefined}
            position="relative"
            minHeight={{ base: '60px', sm: '124px' }}
            minWidth="0"
            p="1.5"
            borderRightWidth={(i + 1) % 7 ? '1px' : '0'}
            borderBottomWidth={i < 35 ? '1px' : '0'}
            cursor={weekend ? 'default' : 'pointer'}
            transition="background-color .15s"
            // Weekends are not working days: greyed out and not selectable.
            bg={
              weekend
                ? 'bg.subtle'
                : isSelected
                  ? 'color-mix(in srgb, var(--chakra-colors-brand-solid) 6%, transparent)'
                  : undefined
            }
            boxShadow={isSelected ? 'inset 0 0 0 2px var(--chakra-colors-brand-solid)' : 'none'}
            _hover={
              weekend
                ? undefined
                : { bg: 'color-mix(in srgb, var(--chakra-colors-brand-solid) 4%, transparent)' }
            }
          >
            <Flex
              display="inline-flex"
              align="center"
              justify="center"
              minWidth="24px"
              height="24px"
              px="1"
              mb="1"
              borderRadius="full"
              textStyle="xs"
              fontWeight={isToday ? 'bold' : 'medium'}
              bg={isToday ? 'brand.solid' : undefined}
              color={
                isToday ? 'brand.contrast' : !inMonth ? 'fg.subtle' : weekend ? 'fg.subtle' : 'fg'
              }
            >
              {day.getDate()}
            </Flex>

            {/* Phones: just a count. */}
            {items.length > 0 && (
              <Text
                textStyle="xs"
                display={{ base: 'block', sm: 'none' }}
                fontWeight="semibold"
                color={open ? 'brand.fg' : 'fg.muted'}
              >
                {items.length}
              </Text>
            )}

            <Flex
              display={{ base: 'none', sm: 'flex' }}
              direction="column"
              gap="1"
              opacity={inMonth ? 1 : 0.55}
            >
              {items.slice(0, MAX_VISIBLE).map(issue => {
                const color = statusColor(issue.status)
                return (
                  <chakra.button
                    key={issue.id}
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onIssueClick(e, issue)
                    }}
                    title={`#${issue.id} ${issue.summary}`}
                    display="block"
                    px="1.5"
                    py="0.5"
                    borderRadius="l1"
                    fontSize="12px"
                    fontWeight="medium"
                    lineHeight="18px"
                    textAlign="left"
                    truncate
                    color="fg"
                    bg={alpha(color, 0.12)}
                    borderLeft={`3px solid ${color}`}
                    textDecoration={isResolved(issue) ? 'line-through' : 'none'}
                    opacity={isResolved(issue) ? 0.55 : 1}
                    cursor="pointer"
                    transition="box-shadow .12s, background-color .12s"
                    _hover={{
                      bg: alpha(color, 0.2),
                      boxShadow: `0 2px 6px -2px ${alpha(color, 0.6)}`
                    }}
                    focusRingStyle="inside"
                  >
                    {issue.summary}
                  </chakra.button>
                )
              })}
              {items.length > MAX_VISIBLE && (
                <Text textStyle="xs" color="fg.muted" pl="1">
                  +{items.length - MAX_VISIBLE} việc khác
                </Text>
              )}
            </Flex>
          </Box>
        )
      })}
    </Grid>
  )
}
