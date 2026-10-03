'use client'

import { Portal, Tooltip as ChakraTooltip } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface Props extends ChakraTooltip.RootProps {
  content: ReactNode
  children: ReactNode
  showArrow?: boolean
  contentProps?: ChakraTooltip.ContentProps
}

export function Tooltip({ content, children, showArrow, contentProps, ...rest }: Props) {
  return (
    <ChakraTooltip.Root openDelay={300} closeDelay={50} {...rest}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content {...contentProps}>
            {showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip />
              </ChakraTooltip.Arrow>
            )}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}
