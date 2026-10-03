'use client'

import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  IconButton,
  Menu,
  Portal,
  Spinner,
  Text,
  Wrap
} from '@chakra-ui/react'
import { useState } from 'react'
import {
  LuCopy,
  LuDownload,
  LuEllipsisVertical,
  LuFile,
  LuFileArchive,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileText,
  LuPaperclip,
  LuPlus
} from 'react-icons/lu'

import { Tooltip } from '@/components/ui/tooltip'
import { formatDateTime } from '@/lib/format'
import type { Attachment } from '@/services/types'

const FILE_KINDS = [
  { test: /pdf/i, icon: <LuFileText />, palette: 'red' },
  { test: /image|\.(png|jpe?g|gif|webp|bmp)$/i, icon: <LuFileImage />, palette: 'blue' },
  { test: /sheet|excel|csv|\.xlsx?$/i, icon: <LuFileSpreadsheet />, palette: 'green' },
  { test: /word|document|\.docx?$/i, icon: <LuFileText />, palette: 'blue' },
  { test: /zip|rar|7z|compressed/i, icon: <LuFileArchive />, palette: 'orange' }
]

const kindOf = (file: Attachment) =>
  FILE_KINDS.find(k => k.test.test(file.content_type ?? '') || k.test.test(file.filename)) ?? {
    icon: <LuFile />,
    palette: 'gray'
  }

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

interface Props {
  files: Attachment[]
  uploading: boolean
  onDownload: (file: Attachment) => Promise<void>
  onAdd?: () => void
}

export default function IssueAttachments({ files, uploading, onDownload, onAdd }: Props) {
  const [downloading, setDownloading] = useState<number | null>(null)

  const download = async (file: Attachment) => {
    if (downloading !== null) return
    setDownloading(file.id)
    try {
      await onDownload(file)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card.Root variant="outline">
      <Card.Header flexDirection="row" alignItems="center" gap="2.5">
        <Box color="brand.fg">
          <LuPaperclip size={20} />
        </Box>
        <Card.Title textStyle="md">Tệp đính kèm</Card.Title>
        <Text color="fg.muted">{files.length}</Text>
        {onAdd && (
          <Button
            ms="auto"
            size="sm"
            variant="outline"
            color="brand.fg"
            onClick={onAdd}
            loading={uploading}
            loadingText="Đang tải lên…"
          >
            <LuPlus /> Thêm tệp
          </Button>
        )}
      </Card.Header>
      <Card.Body pt="4">
        {files.length === 0 ? (
          <Text textStyle="sm" color="fg.muted">
            Chưa có tệp nào.
          </Text>
        ) : (
          <Wrap gap="3">
            {files.map(file => {
              const kind = kindOf(file)
              const uploader = file.reporter?.real_name || file.reporter?.name
              return (
                <HStack
                  key={file.id}
                  gap="3"
                  py="2.5"
                  ps="3"
                  pe="1.5"
                  borderWidth="1px"
                  borderRadius="l2"
                  maxWidth={{ base: '100%', md: '540px' }}
                  transition="border-color .15s"
                  _hover={{ borderColor: 'border.emphasized' }}
                >
                  <Flex
                    colorPalette={kind.palette}
                    boxSize="40px"
                    flexShrink={0}
                    borderRadius="l2"
                    align="center"
                    justify="center"
                    fontSize="lg"
                    color="colorPalette.fg"
                    bg="colorPalette.subtle"
                  >
                    {kind.icon}
                  </Flex>
                  <Box flex="1" minWidth="0">
                    <Text textStyle="sm" fontWeight="medium" truncate title={file.filename}>
                      {file.filename}
                    </Text>
                    <Text textStyle="xs" color="fg.muted" truncate>
                      {[formatSize(file.size), uploader, formatDateTime(file.created_at)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Box>
                  <Tooltip content="Tải xuống">
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorPalette="gray"
                      aria-label={`Tải xuống ${file.filename}`}
                      onClick={() => download(file)}
                    >
                      {downloading === file.id ? <Spinner size="sm" /> : <LuDownload />}
                    </IconButton>
                  </Tooltip>
                  <Menu.Root positioning={{ placement: 'bottom-end' }}>
                    <Menu.Trigger asChild>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="gray"
                        aria-label="Thao tác với tệp"
                      >
                        <LuEllipsisVertical />
                      </IconButton>
                    </Menu.Trigger>
                    <Portal>
                      <Menu.Positioner>
                        <Menu.Content>
                          <Menu.Item value="download" onClick={() => download(file)}>
                            <LuDownload /> Tải xuống
                          </Menu.Item>
                          <Menu.Item
                            value="copy"
                            onClick={() => navigator.clipboard?.writeText(file.filename)}
                          >
                            <LuCopy /> Sao chép tên tệp
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Portal>
                  </Menu.Root>
                </HStack>
              )
            })}
          </Wrap>
        )}
      </Card.Body>
    </Card.Root>
  )
}
