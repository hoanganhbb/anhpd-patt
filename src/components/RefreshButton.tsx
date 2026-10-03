import { IconButton } from '@chakra-ui/react'
import { LuRefreshCw } from 'react-icons/lu'

import { Tooltip } from './ui/tooltip'

// Header action that re-fetches the page data.
export default function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip content="Tải lại">
      <IconButton variant="ghost" colorPalette="gray" onClick={onClick} aria-label="Tải lại">
        <LuRefreshCw />
      </IconButton>
    </Tooltip>
  )
}
