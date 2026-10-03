import { Alert as ChakraAlert, CloseButton } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props extends Omit<ChakraAlert.RootProps, 'title'> {
  children: ReactNode
  // Rendered on the right, e.g. a button.
  action?: ReactNode
  onClose?: () => void
}

export function Alert({ children, action, onClose, ...rest }: Props) {
  return (
    <ChakraAlert.Root alignItems="center" {...rest}>
      <ChakraAlert.Indicator />
      <ChakraAlert.Content>
        <ChakraAlert.Description>{children}</ChakraAlert.Description>
      </ChakraAlert.Content>
      {action}
      {onClose && <CloseButton size="xs" onClick={onClose} aria-label="Đóng" />}
    </ChakraAlert.Root>
  )
}
