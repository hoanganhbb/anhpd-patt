import { Field as ChakraField } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props extends Omit<ChakraField.RootProps, 'label'> {
  label?: ReactNode
  helperText?: ReactNode
  errorText?: ReactNode
}

export function Field({ label, helperText, errorText, children, ...rest }: Props) {
  return (
    <ChakraField.Root {...rest}>
      {label && (
        <ChakraField.Label>
          {label}
          <ChakraField.RequiredIndicator />
        </ChakraField.Label>
      )}
      {children}
      {helperText && <ChakraField.HelperText>{helperText}</ChakraField.HelperText>}
      {errorText && <ChakraField.ErrorText>{errorText}</ChakraField.ErrorText>}
    </ChakraField.Root>
  )
}
