import FlagIcon from '@mui/icons-material/Flag'
import Box from '@mui/material/Box'

import type { Ref } from '@/services/types'

const COLORS: Record<string, string> = {
  none: '#8b8d98',
  low: '#0ea5a4',
  normal: '#0b8ae6',
  high: '#f59e0b',
  urgent: '#e5484d',
  immediate: '#b3261e'
}

export default function PriorityBadge({ priority }: { priority?: Ref }) {
  if (!priority) return null
  const color = COLORS[priority.name] ?? COLORS.none
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: 13,
        whiteSpace: 'nowrap'
      }}
    >
      <FlagIcon sx={{ fontSize: 16, color }} />
      {priority.label ?? priority.name}
    </Box>
  )
}
