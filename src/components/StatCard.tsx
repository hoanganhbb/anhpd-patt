import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  icon: ReactNode
  color: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
}

export default function StatCard({ label, value, icon, color }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.75 }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: `${color}.main`,
          bgcolor: t => t.alpha((t.vars || t).palette[color].main, 0.12)
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Box>
    </Paper>
  )
}
