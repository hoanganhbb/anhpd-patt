import Avatar from '@mui/material/Avatar'

// Stable colour per name so the same person always gets the same avatar.
const COLORS = [
  '#5b5bd6',
  '#0ea5a4',
  '#e5484d',
  '#f59e0b',
  '#16a34a',
  '#0b8ae6',
  '#d6409f',
  '#8e4ec6'
]

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')

export default function UserAvatar({ name, size = 28 }: { name?: string; size?: number }) {
  const label = name?.trim() || '?'
  const hash = [...label].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <Avatar
      title={name}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        fontWeight: 600,
        bgcolor: name ? COLORS[hash % COLORS.length] : 'action.disabled'
      }}
    >
      {name ? initials(label) : '?'}
    </Avatar>
  )
}
