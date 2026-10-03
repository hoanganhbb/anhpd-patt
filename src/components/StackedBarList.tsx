'use client'

import { Box, Button, Grid, HStack, Text } from '@chakra-ui/react'
import { useState, type ReactNode } from 'react'

import { STATUS_GROUPS, type GroupRow } from '@/lib/reports'

import { Panel } from './ui/panel'
import { Tooltip } from './ui/tooltip'

const PREVIEW = 15

// Fill of a status group, stepped per colour mode.
export const swatch = (g: (typeof STATUS_GROUPS)[number]) => ({ _light: g.light, _dark: g.dark })

export function StatusLegend() {
  return (
    <HStack gap="4" wrap="wrap">
      {STATUS_GROUPS.map(g => (
        <HStack key={g.key} gap="1.5">
          <Box boxSize="10px" borderRadius="2px" bg={swatch(g)} />
          <Text textStyle="xs" color="fg.muted">
            {g.label}
          </Text>
        </HStack>
      ))}
    </HStack>
  )
}

function RowTooltip({ row }: { row: GroupRow }) {
  return (
    <Box minWidth="160px" py="1">
      <Text textStyle="sm" fontWeight="semibold" mb="1">
        {row.label}
      </Text>
      {STATUS_GROUPS.map(g => (
        <HStack key={g.key} gap="2">
          <Box boxSize="8px" borderRadius="2px" bg={swatch(g)} />
          <Text textStyle="xs" flexGrow={1}>
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

interface Props {
  icon?: ReactNode
  title: string
  subtitle?: string
  rows: GroupRow[]
}

// Horizontal bars, one per row, stacked by status group and sorted by total.
export default function StackedBarList({ icon, title, subtitle, rows }: Props) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? rows : rows.slice(0, PREVIEW)
  const max = rows[0]?.total || 1

  return (
    <Panel
      icon={icon}
      title={title}
      description={subtitle}
      actions={<StatusLegend />}
      height="100%"
    >
      {rows.length === 0 && (
        <Text color="fg.muted" py="8" textAlign="center">
          Không có dữ liệu
        </Text>
      )}

      <Grid gap="0.5">
        {shown.map(row => (
          <Tooltip
            key={row.key}
            content={<RowTooltip row={row} />}
            positioning={{ placement: 'top' }}
          >
            <Grid
              templateColumns={{ base: '120px 1fr 44px', sm: '200px 1fr 52px' }}
              alignItems="center"
              gap="3"
              px="2"
              py="1.5"
              borderRadius="l2"
              _hover={{ bg: 'bg.muted' }}
            >
              <Text textStyle="sm" truncate title={row.label}>
                {row.label}
              </Text>
              <Box display="flex" gap="2px" height="14px">
                {STATUS_GROUPS.filter(g => row.counts[g.key] > 0).map((g, i, arr) => (
                  <Box
                    key={g.key}
                    width={`${(row.counts[g.key] / max) * 100}%`}
                    minWidth="2px"
                    borderRadius={i === arr.length - 1 ? '0 4px 4px 0' : '0'}
                    bg={swatch(g)}
                  />
                ))}
              </Box>
              <Text
                textStyle="sm"
                textAlign="right"
                fontWeight="semibold"
                fontVariantNumeric="tabular-nums"
              >
                {row.total.toLocaleString('vi-VN')}
              </Text>
            </Grid>
          </Tooltip>
        ))}
      </Grid>

      {rows.length > PREVIEW && (
        <Button
          size="sm"
          variant="ghost"
          alignSelf="start"
          mt="2"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Thu gọn' : `Xem tất cả (${rows.length})`}
        </Button>
      )}
    </Panel>
  )
}
