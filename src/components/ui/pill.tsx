import { HStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

// Bordered pill for meta values next to a title (priority, severity…).
export function Pill({ children }: { children: ReactNode }) {
  return (
    <HStack
      as="span"
      display="inline-flex"
      gap="1.5"
      px="3"
      py="1"
      borderWidth="1px"
      borderRadius="full"
      bg="bg.panel"
      textStyle="sm"
      color="fg"
    >
      {children}
    </HStack>
  )
}
