'use client'

import { Box, Flex, Grid, HStack, SegmentGroup, Stack, Table, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuChartColumn } from 'react-icons/lu'

import { StatusLegend, swatch } from '@/components/StackedBarList'
import { Panel } from '@/components/ui/panel'
import { Tooltip } from '@/components/ui/tooltip'
import { STATUS_GROUPS, type DayRow } from '@/lib/reports'

const PLOT_HEIGHT = 200

// Round the axis maximum up to a clean step (1/2/5 × 10ⁿ) with 4 gridlines.
const niceMax = (max: number) => {
  if (max <= 4) return 4
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map(m => m * pow).find(s => s >= raw) ?? raw
  return step * 4
}

const shortDate = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`
const longDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
  })

function DayTooltip({ row }: { row: DayRow }) {
  return (
    <Box minWidth="160px" py="1">
      <Text textStyle="sm" fontWeight="semibold" mb="1" textTransform="capitalize">
        {longDate(row.date)}
      </Text>
      {STATUS_GROUPS.map(g => (
        <HStack key={g.key} gap="2">
          <Box boxSize="8px" borderRadius="2px" bg={swatch(g)} />
          <Text textStyle="xs" flex="1">
            {g.label}
          </Text>
          <Text textStyle="xs" fontVariantNumeric="tabular-nums">
            {row.counts[g.key]}
          </Text>
        </HStack>
      ))}
      <Text textStyle="xs" mt="1" fontWeight="semibold">
        Tổng: {row.total}
      </Text>
    </Box>
  )
}

function Columns({ rows }: { rows: DayRow[] }) {
  const max = Math.max(0, ...rows.map(r => r.total))
  const top = niceMax(max)
  const ticks = [4, 3, 2, 1, 0].map(i => (top / 4) * i)
  // Label only the extreme, and the x-axis every few days.
  const peak = rows.findIndex(r => r.total === max && max > 0)
  const every = Math.ceil(rows.length / 8)

  return (
    <Grid templateColumns="auto minmax(0, 1fr)" columnGap="2">
      {/* Y axis */}
      <Box position="relative" height={`${PLOT_HEIGHT}px`} minWidth="24px">
        {ticks.map(t => (
          <Text
            key={t}
            position="absolute"
            right="0"
            top={`${(1 - t / top) * 100}%`}
            transform="translateY(-50%)"
            textStyle="xs"
            color="fg.muted"
            fontVariantNumeric="tabular-nums"
          >
            {t.toLocaleString('vi-VN')}
          </Text>
        ))}
      </Box>

      {/* Plot */}
      <Box position="relative" height={`${PLOT_HEIGHT}px`}>
        {ticks.map(t => (
          <Box
            key={t}
            position="absolute"
            left="0"
            right="0"
            top={`${(1 - t / top) * 100}%`}
            borderTopWidth="1px"
            borderColor={t === 0 ? 'border.emphasized' : 'border'}
          />
        ))}
        <Flex position="absolute" inset="0" align="stretch">
          {rows.map((row, i) => (
            <Tooltip
              key={row.date}
              content={<DayTooltip row={row} />}
              positioning={{ placement: 'top' }}
            >
              {/* The whole day slot is the hover target, not just the column. */}
              <Flex
                flex="1"
                direction="column"
                justify="flex-end"
                align="center"
                position="relative"
                tabIndex={0}
                aria-label={`${shortDate(row.date)}: ${row.total} phiếu`}
                _hover={{ bg: 'bg.muted' }}
                _focusVisible={{ bg: 'bg.muted', outline: 'none' }}
                borderRadius="l1"
              >
                {i === peak && (
                  <Text
                    textStyle="xs"
                    fontWeight="semibold"
                    color="fg"
                    mb="1"
                    fontVariantNumeric="tabular-nums"
                  >
                    {row.total.toLocaleString('vi-VN')}
                  </Text>
                )}
                <Flex
                  direction="column-reverse"
                  gap="2px"
                  width="70%"
                  maxWidth="24px"
                  height={`${(row.total / top) * 100}%`}
                  borderTopRadius="4px"
                  overflow="hidden"
                >
                  {STATUS_GROUPS.filter(g => row.counts[g.key] > 0).map(g => (
                    <Box
                      key={g.key}
                      flexGrow={row.counts[g.key]}
                      flexBasis="0"
                      minHeight="2px"
                      bg={swatch(g)}
                    />
                  ))}
                </Flex>
              </Flex>
            </Tooltip>
          ))}
        </Flex>
      </Box>

      {/* X axis */}
      <Box />
      <Flex pt="1.5">
        {rows.map((row, i) => (
          <Text
            key={row.date}
            flex="1"
            textAlign="center"
            textStyle="xs"
            color="fg.muted"
            whiteSpace="nowrap"
            visibility={(rows.length - 1 - i) % every === 0 ? 'visible' : 'hidden'}
          >
            {shortDate(row.date)}
          </Text>
        ))}
      </Flex>
    </Grid>
  )
}

function DaysTable({ rows }: { rows: DayRow[] }) {
  const shown = rows.filter(r => r.total > 0).reverse()
  return (
    <Table.ScrollArea maxHeight={`${PLOT_HEIGHT + 30}px`} borderWidth="1px" borderRadius="l2">
      <Table.Root size="sm" stickyHeader>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Ngày</Table.ColumnHeader>
            {STATUS_GROUPS.map(g => (
              <Table.ColumnHeader key={g.key} textAlign="end">
                {g.label}
              </Table.ColumnHeader>
            ))}
            <Table.ColumnHeader textAlign="end">Tổng</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {shown.map(r => (
            <Table.Row key={r.date}>
              <Table.Cell>{shortDate(r.date)}</Table.Cell>
              {STATUS_GROUPS.map(g => (
                <Table.Cell key={g.key} textAlign="end" fontVariantNumeric="tabular-nums">
                  {r.counts[g.key]}
                </Table.Cell>
              ))}
              <Table.Cell textAlign="end" fontWeight="semibold" fontVariantNumeric="tabular-nums">
                {r.total}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}

// Issues created per day, stacked by their current status group, with a table twin.
export default function TrendChart({ rows }: { rows: DayRow[] }) {
  const [view, setView] = useState<string>('chart')
  const total = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <Panel
      icon={<LuChartColumn />}
      title="Phiếu tạo theo ngày"
      description={`${rows.length} ngày gần nhất · ${total.toLocaleString('vi-VN')} phiếu`}
      height="100%"
      actions={
        <SegmentGroup.Root size="xs" value={view} onValueChange={e => setView(e.value ?? 'chart')}>
          <SegmentGroup.Indicator />
          <SegmentGroup.Items
            items={[
              { value: 'chart', label: 'Biểu đồ' },
              { value: 'table', label: 'Bảng' }
            ]}
          />
        </SegmentGroup.Root>
      }
    >
      <Stack gap="4">
        <StatusLegend />
        {view === 'chart' ? <Columns rows={rows} /> : <DaysTable rows={rows} />}
      </Stack>
    </Panel>
  )
}
