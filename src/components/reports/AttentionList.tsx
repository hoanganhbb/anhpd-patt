'use client'

import { Badge, Box, HStack, Stack, StackSeparator, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuAlarmClock, LuCircleCheckBig, LuHourglass, LuTriangleAlert } from 'react-icons/lu'

import { Panel } from '@/components/ui/panel'
import UserAvatar from '@/components/UserAvatar'
import { ageDays, isOverdue } from '@/lib/reports'
import type { Issue } from '@/services/types'

const DAY = 24 * 3600 * 1000

interface Props {
  issues: Issue[]
  now: number
}

// Open issues to act on: overdue first, then the oldest. State is icon + label, not colour alone.
export default function AttentionList({ issues, now }: Props) {
  return (
    <Panel
      icon={<LuAlarmClock />}
      title="Cần chú ý"
      description="Phiếu quá hạn hoặc tồn lâu nhất"
      height="100%"
      bodyProps={{ px: '0', pb: '2' }}
    >
      {issues.length === 0 ? (
        <Stack align="center" gap="1" py="6" color="fg.muted">
          <LuCircleCheckBig size={28} />
          <Text>Không có phiếu tồn đọng</Text>
        </Stack>
      ) : (
        <Stack gap="0" separator={<StackSeparator />}>
          {issues.map(issue => {
            const overdue = isOverdue(issue, now)
            const late = overdue
              ? Math.max(1, Math.floor((now - new Date(issue.due_date!).getTime()) / DAY))
              : 0
            const handler = issue.handler?.real_name || issue.handler?.name
            return (
              <HStack
                key={issue.id}
                asChild
                gap="3"
                px="6"
                py="2.5"
                _hover={{ bg: 'bg.muted' }}
                focusRingStyle="inside"
              >
                <NextLink href={`/issues/${issue.id}`}>
                  <UserAvatar name={handler} size={28} />
                  <Box flex="1" minWidth="0">
                    <Text textStyle="sm" fontWeight="medium" truncate>
                      {issue.summary}
                    </Text>
                    <Text textStyle="xs" color="fg.muted" truncate>
                      #{issue.id} · {handler ?? 'Chưa giao'}
                    </Text>
                  </Box>
                  {overdue ? (
                    <Badge colorPalette="red" variant="subtle" flexShrink={0}>
                      <LuTriangleAlert /> Quá hạn {late} ngày
                    </Badge>
                  ) : (
                    <Badge colorPalette="gray" variant="subtle" flexShrink={0}>
                      <LuHourglass /> Tồn {ageDays(issue, now)} ngày
                    </Badge>
                  )}
                </NextLink>
              </HStack>
            )
          })}
        </Stack>
      )}
    </Panel>
  )
}
