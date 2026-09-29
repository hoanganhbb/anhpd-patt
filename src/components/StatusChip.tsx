import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'

import type { Ref } from '@/services/types'

// Mantis status colours are pastel and unreadable as text, so use a saturated colour per status id.
const FALLBACK: Record<number, string> = {
  10: '#e5484d',
  20: '#d6409f',
  30: '#f59e0b',
  40: '#eab308',
  50: '#0b8ae6',
  80: '#16a34a',
  90: '#8b8d98'
}

export const statusColor = (status?: Ref) => FALLBACK[status?.id ?? 0] ?? '#8b8d98'

export default function StatusChip({ status }: { status?: Ref }) {
  if (!status) return null
  const color = statusColor(status)
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '20px',
        whiteSpace: 'nowrap',
        color,
        bgcolor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.25)}`
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
      {status.label ?? status.name}
    </Box>
  )
}
