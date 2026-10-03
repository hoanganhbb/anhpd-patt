import { Progress, type SystemStyleObject } from '@chakra-ui/react'

// Thin bar above data that is (re)loading. It keeps its space while hidden so the layout
// doesn't jump. Pass `value` (0–100) for determinate progress.
export default function LoadingBar({
  loading,
  value = null,
  mb
}: {
  loading: boolean
  value?: number | null
  mb?: SystemStyleObject['marginBottom']
}) {
  return (
    <Progress.Root value={value} size="xs" mb={mb} visibility={loading ? 'visible' : 'hidden'}>
      <Progress.Track borderRadius="0">
        <Progress.Range />
      </Progress.Track>
    </Progress.Root>
  )
}
