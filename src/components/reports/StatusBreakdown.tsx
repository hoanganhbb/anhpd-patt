'use client'

import { Box, Flex, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import { LuChartPie } from 'react-icons/lu'

import { swatch } from '@/components/StackedBarList'
import StatusChip from '@/components/StatusChip'
import { Panel } from '@/components/ui/panel'
import { Tooltip } from '@/components/ui/tooltip'
import { STATUS_GROUPS, type StatusGroup } from '@/lib/reports'
import type { Issue, Ref } from '@/services/types'

const percent = (part: number, whole: number) =>
  whole ? `${((part / whole) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '0%'

interface Props {
  issues: Issue[]
  totals: Record<StatusGroup, number>
}

// Part-to-whole of the three status groups as one 100% bar, then the exact Mantis statuses.
export default function StatusBreakdown({ issues, totals }: Props) {
  const total = issues.length
  const statuses = [
    ...issues
      .reduce((map, i) => {
        if (!i.status) return map
        const row = map.get(i.status.id) ?? { status: i.status, count: 0 }
        row.count++
        return map.set(i.status.id, row)
      }, new Map<number, { status: Ref; count: number }>())
      .values()
  ].sort((a, b) => b.count - a.count)

  return (
    <Panel icon={<LuChartPie />} title="Phân bố trạng thái" height="100%" bodyProps={{ gap: '5' }}>
      <Flex height="12px" gap="2px" borderRadius="full" overflow="hidden" bg="bg.muted">
        {STATUS_GROUPS.filter(g => totals[g.key] > 0).map(g => (
          <Tooltip
            key={g.key}
            content={`${g.label}: ${totals[g.key]} (${percent(totals[g.key], total)})`}
          >
            <Box flexGrow={totals[g.key]} flexBasis="0" minWidth="2px" bg={swatch(g)} />
          </Tooltip>
        ))}
      </Flex>

      <Stack gap="2.5">
        {STATUS_GROUPS.map(g => (
          <HStack key={g.key} gap="2.5" textStyle="sm">
            <Box boxSize="10px" borderRadius="2px" bg={swatch(g)} flexShrink={0} />
            <Text flex="1">{g.label}</Text>
            <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">
              {totals[g.key].toLocaleString('vi-VN')}
            </Text>
            <Text color="fg.muted" width="52px" textAlign="end" fontVariantNumeric="tabular-nums">
              {percent(totals[g.key], total)}
            </Text>
          </HStack>
        ))}
      </Stack>

      <Separator />

      <Stack gap="2">
        <Text textStyle="xs" color="fg.muted" fontWeight="medium">
          Theo trạng thái chi tiết
        </Text>
        {statuses.map(({ status, count }) => (
          <HStack key={status.id} gap="2.5" textStyle="sm">
            <Box flex="1">
              <StatusChip status={status} />
            </Box>
            <Text fontVariantNumeric="tabular-nums">{count.toLocaleString('vi-VN')}</Text>
            <Text color="fg.muted" width="52px" textAlign="end" fontVariantNumeric="tabular-nums">
              {percent(count, total)}
            </Text>
          </HStack>
        ))}
      </Stack>
    </Panel>
  )
}
