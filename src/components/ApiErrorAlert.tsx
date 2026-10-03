import { Button, type Alert as ChakraAlert } from '@chakra-ui/react'
import NextLink from 'next/link'

import { Alert } from './ui/alert'

// Page-level load error. HTTP 428 means no API-KEY is configured, so offer the settings page.
export default function ApiErrorAlert({
  error,
  ...rest
}: { error?: string } & Omit<ChakraAlert.RootProps, 'title'>) {
  if (!error) return null
  return (
    <Alert
      {...rest}
      status="error"
      action={
        error.startsWith('428') ? (
          <Button size="xs" variant="outline" colorPalette="red" asChild>
            <NextLink href="/settings">Cấu hình API-KEY</NextLink>
          </Button>
        ) : undefined
      }
    >
      {error}
    </Alert>
  )
}
