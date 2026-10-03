'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import system from '@/theme'

import { EmotionRegistry } from './emotion-registry'
import { Toaster } from './toaster'

export function Provider({ children }: { children: ReactNode }) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </ChakraProvider>
    </EmotionRegistry>
  )
}
