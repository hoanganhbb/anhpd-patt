import { Box } from '@chakra-ui/react'

import { alpha } from '@/lib/color'
import type { Ref } from '@/services/types'

// Mantis status colours are pastel and unreadable as text, so use a saturated colour per status id.
const FALLBACK: Record<number, string> = {
  10: '#d9534f',
  20: '#c2577a',
  30: '#d97706',
  40: '#b8860b',
  50: '#2f7fc1',
  80: '#1a9b8c',
  90: '#8a817a'
}

export const statusColor = (status?: Ref) => FALLBACK[status?.id ?? 0] ?? '#8a817a'

export default function StatusChip({ status }: { status?: Ref }) {
  if (!status) return null
  const color = statusColor(status)
  const label = status.label ?? status.name
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap="1.5"
      px="2.5"
      py="0.5"
      borderRadius="full"
      borderWidth="1px"
      borderColor={alpha(color, 0.28)}
      fontSize="12px"
      fontWeight="semibold"
      lineHeight="20px"
      whiteSpace="nowrap"
      // Darken (light mode) / lighten (dark mode) the hue so the label stays readable.
      color={{
        _light: `color-mix(in srgb, ${color} 72%, black)`,
        _dark: `color-mix(in srgb, ${color} 65%, white)`
      }}
      bg={{ _light: alpha(color, 0.14), _dark: alpha(color, 0.22) }}
    >
      <Box as="span" boxSize="6px" borderRadius="full" bg={color} />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </Box>
  )
}
