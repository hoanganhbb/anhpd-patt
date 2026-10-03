import { Box, Flex, Grid, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { formatDateTime, timeAgo } from '@/lib/format'

// One "label | icon | value" row of a detail panel. Stack rows with <Stack gap="3.5">.
export function InfoRow({
  label,
  icon,
  children
}: {
  label: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <Grid templateColumns="120px 20px minmax(0, 1fr)" gap="2" alignItems="start" textStyle="sm">
      <Text color="fg.muted" pt="0.5">
        {label}
      </Text>
      <Flex color="fg.muted" pt="1" justify="center">
        {icon}
      </Flex>
      <Box color="fg" pt="0.5" minWidth="0">
        {children ?? <Text color="fg.subtle">—</Text>}
      </Box>
    </Grid>
  )
}

// "label | date + relative time" row; `danger` marks an overdue date.
export function DateRow({
  label,
  value,
  danger
}: {
  label: string
  value?: string
  danger?: boolean
}) {
  return (
    <Grid templateColumns="120px minmax(0, 1fr)" gap="2" alignItems="start" textStyle="sm">
      <Text color="fg.muted">{label}</Text>
      {value ? (
        <Box>
          <Text color={danger ? 'red.fg' : 'fg'} fontWeight={danger ? 'semibold' : undefined}>
            {formatDateTime(value)}
          </Text>
          <Text textStyle="xs" color={danger ? 'red.fg' : 'fg.muted'}>
            {danger ? 'Quá hạn · ' : ''}
            {timeAgo(value)}
          </Text>
        </Box>
      ) : (
        <Text color="fg.subtle">—</Text>
      )}
    </Grid>
  )
}
