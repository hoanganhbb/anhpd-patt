import { Card, Flex, HStack, Text, type ColorPalette } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  icon: ReactNode
  colorPalette: ColorPalette | 'brand'
  // Secondary line under the value: share, context, period.
  hint?: ReactNode
}

export default function StatCard({ label, value, icon, colorPalette, hint }: Props) {
  return (
    <Card.Root variant="outline">
      <Card.Body p="5" gap="3">
        <HStack justify="space-between" gap="2">
          <Text textStyle="sm" color="fg.muted" truncate>
            {label}
          </Text>
          <Flex
            colorPalette={colorPalette}
            boxSize="30px"
            borderRadius="l2"
            align="center"
            justify="center"
            flexShrink={0}
            color="colorPalette.fg"
            bg="colorPalette.subtle"
          >
            {icon}
          </Flex>
        </HStack>
        <Text fontSize="3xl" fontWeight="semibold" lineHeight="1" letterSpacing="-0.02em">
          {value}
        </Text>
        {hint && (
          <Text textStyle="xs" color="fg.muted" mt="-1" truncate>
            {hint}
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  )
}
