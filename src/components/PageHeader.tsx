import { Box, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <Stack
      direction={{ base: 'column', sm: 'row' }}
      gap="4"
      align={{ sm: 'flex-end' }}
      justify="space-between"
      mb="8"
    >
      <Box minWidth="0">
        <Heading
          as="h1"
          fontSize={{ base: '26px', md: '32px' }}
          fontWeight="semibold"
          letterSpacing="-0.025em"
          lineHeight="1.15"
        >
          {title}
        </Heading>
        {subtitle && (
          <Text color="fg.muted" mt="1.5">
            {subtitle}
          </Text>
        )}
      </Box>
      {actions && (
        <HStack gap="2" flexShrink={0} wrap="wrap">
          {actions}
        </HStack>
      )}
    </Stack>
  )
}
