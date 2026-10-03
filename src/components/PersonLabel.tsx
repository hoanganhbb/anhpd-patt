import { HStack, Text } from '@chakra-ui/react'

import type { Ref } from '@/services/types'

import UserAvatar from './UserAvatar'

// Avatar + display name of a Mantis user; `fallback` when nobody is set.
export default function PersonLabel({
  person,
  fallback = '—',
  size = 24
}: {
  person?: Ref
  fallback?: string
  size?: number
}) {
  const name = person?.real_name || person?.name
  if (!name) return <Text color="fg.subtle">{fallback}</Text>
  return (
    <HStack gap="2" minWidth="0">
      <UserAvatar name={name} size={size} />
      <Text truncate title={person?.name ? `${name} (@${person.name})` : name}>
        {name}
      </Text>
    </HStack>
  )
}
