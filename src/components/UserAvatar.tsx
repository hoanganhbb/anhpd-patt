import { Avatar } from '@chakra-ui/react'

// Stable colour per name so the same person always gets the same avatar.
const COLORS = [
  '#1a9b8c',
  '#c8763a',
  '#c2577a',
  '#5f7fb8',
  '#7d6bb3',
  '#5a9a5f',
  '#b0893a',
  '#6b7f88'
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
    <Avatar.Root
      title={name}
      width={`${size}px`}
      height={`${size}px`}
      flexShrink={0}
      color="white"
      bg={name ? COLORS[hash % COLORS.length] : 'gray.400'}
    >
      <Avatar.Fallback fontSize={`${size * 0.4}px`} fontWeight="semibold">
        {name ? initials(label) : '?'}
      </Avatar.Fallback>
    </Avatar.Root>
  )
}
