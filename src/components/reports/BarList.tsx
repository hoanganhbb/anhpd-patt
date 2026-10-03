'use client'

import { Box, Button, Grid, Text } from '@chakra-ui/react'
import { useState, type ReactNode } from 'react'

import { Panel } from '@/components/ui/panel'
import { Tooltip } from '@/components/ui/tooltip'

interface Row {
  key: string
  label: string
  total: number
}

interface Props {
  icon: ReactNode
  title: string
  description?: string
  rows: Row[]
  preview?: number
}

// One series compared across nominal categories: a single hue, value at the bar tip.
export default function BarList({ icon, title, description, rows, preview = 6 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? rows : rows.slice(0, preview)
  const max = rows[0]?.total || 1
  const total = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <Panel icon={icon} title={title} description={description} height="100%">
      {rows.length === 0 ? (
        <Text color="fg.muted" py="6" textAlign="center">
          Không có dữ liệu
        </Text>
      ) : (
        <Grid gap="3">
          {shown.map(row => (
            <Tooltip
              key={row.key}
              content={`${row.label}: ${row.total.toLocaleString('vi-VN')} phiếu (${Math.round((row.total / total) * 100)}%)`}
              positioning={{ placement: 'top-start' }}
            >
              <Box
                tabIndex={0}
                borderRadius="l1"
                _focusVisible={{ outline: 'none', bg: 'bg.muted' }}
              >
                <Text textStyle="sm" truncate mb="1" title={row.label}>
                  {row.label}
                </Text>
                <Grid templateColumns="minmax(0, 1fr) 48px" alignItems="center" gap="2">
                  <Box height="10px" borderRadius="0 4px 4px 0" bg="bg.muted">
                    <Box
                      height="100%"
                      width={`${(row.total / max) * 100}%`}
                      minWidth="2px"
                      borderRadius="0 4px 4px 0"
                      bg="brand.solid"
                    />
                  </Box>
                  <Text
                    textStyle="sm"
                    fontWeight="semibold"
                    textAlign="end"
                    fontVariantNumeric="tabular-nums"
                  >
                    {row.total.toLocaleString('vi-VN')}
                  </Text>
                </Grid>
              </Box>
            </Tooltip>
          ))}
        </Grid>
      )}
      {rows.length > preview && (
        <Button
          size="sm"
          variant="ghost"
          alignSelf="start"
          mt="3"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Thu gọn' : `Xem tất cả (${rows.length})`}
        </Button>
      )}
    </Panel>
  )
}
