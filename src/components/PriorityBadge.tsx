import { HStack } from '@chakra-ui/react'
import { LuFlag } from 'react-icons/lu'

import type { Ref } from '@/services/types'

const COLORS: Record<string, string> = {
  none: '#8b8d98',
  low: '#0ea5a4',
  normal: '#0b8ae6',
  high: '#f59e0b',
  urgent: '#e5484d',
  immediate: '#b3261e'
}

export default function PriorityBadge({ priority }: { priority?: Ref }) {
  if (!priority) return null
  const color = COLORS[priority.name] ?? COLORS.none
  return (
    <HStack as="span" display="inline-flex" gap="1" fontSize="13px" whiteSpace="nowrap">
      <LuFlag size={15} color={color} fill={color} />
      {priority.label ?? priority.name}
    </HStack>
  )
}
