'use client'

import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  IconButton,
  Popover,
  Portal,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea
} from '@chakra-ui/react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  LuArrowRight,
  LuAtSign,
  LuCirclePlus,
  LuEye,
  LuHistory,
  LuMessageSquareText,
  LuPaperclip,
  LuPencil,
  LuSend,
  LuSmile,
  LuUserRound
} from 'react-icons/lu'

import StatusChip from '@/components/StatusChip'
import { Tooltip } from '@/components/ui/tooltip'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime, timeAgo } from '@/lib/format'
import type { HistoryEntry, Note, Ref } from '@/services/types'

type Item =
  { kind: 'note'; at: string; note: Note } | { kind: 'history'; at: string; entry: HistoryEntry }

const EMOJIS = ['👍', '✅', '🙏', '😊', '🎉', '👀', '⚠️', '❗', '📌', '🔥', '💡', '⏳']

const personName = (ref?: Partial<Ref>) => ref?.real_name || ref?.name || ''

const Time = ({ value }: { value: string }) => (
  <Tooltip content={formatDateTime(value)}>
    <Text as="span" textStyle="xs" color="fg.muted" whiteSpace="nowrap">
      {timeAgo(value)}
    </Text>
  </Tooltip>
)

const historyIcon = (entry: HistoryEntry) => {
  if (entry.type?.name === 'issue-new') return <LuCirclePlus />
  if (entry.type?.name?.startsWith('file')) return <LuPaperclip />
  if (entry.type?.name?.startsWith('monitor')) return <LuEye />
  if (entry.field?.name === 'handler') return <LuUserRound />
  if (entry.type?.name === 'field-updated') return <LuPencil />
  return <LuHistory />
}

// "a => b" becomes old → new, rendered with status chips / names when we know the field.
function Change({ entry }: { entry: HistoryEntry }) {
  const { field, old_value, new_value } = entry
  if (field?.name === 'status' && new_value?.id) {
    return (
      <HStack as="span" gap="2" display="inline-flex" wrap="wrap" verticalAlign="middle">
        {old_value?.id ? <StatusChip status={old_value as Ref} /> : null}
        <Box as="span" color="fg.muted">
          <LuArrowRight />
        </Box>
        <StatusChip status={new_value as Ref} />
      </HStack>
    )
  }
  if (field?.name === 'handler') {
    const before = personName(old_value)
    const after = personName(new_value)
    return (
      <Text as="span" color="fg">
        {before ? `${before} → ` : ''}
        {after || 'Bỏ giao'}
      </Text>
    )
  }
  if (!entry.change) return null
  const [before, after] = entry.change.split('=>').map(s => s.trim())
  return (
    <Text as="span" color="fg">
      {before ? `${before} → ` : ''}
      {after}
    </Text>
  )
}

// Left gutter: a small icon on the timeline rail.
const Rail = ({ children }: { children: ReactNode }) => (
  <Flex
    width="24px"
    flexShrink={0}
    justify="center"
    pt="1.5"
    color="fg.muted"
    fontSize="14px"
    position="relative"
    zIndex="1"
  >
    <Flex bg="bg.panel" py="0.5">
      {children}
    </Flex>
  </Flex>
)

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const name = personName(entry.user) || 'Hệ thống'
  let action: ReactNode
  if (entry.type?.name === 'issue-new') action = 'đã tạo yêu cầu'
  else if (entry.type?.name === 'file-added') action = `đã đính kèm ${entry.file?.filename ?? ''}`
  else if (entry.field)
    action = (
      <>
        đã cập nhật {entry.field.label ?? entry.field.name}
        <Box as="span" mx="2" color="fg.subtle">
          ·
        </Box>
        <Change entry={entry} />
      </>
    )
  else action = entry.message?.toLowerCase()

  return (
    <HStack align="flex-start" gap="3" py="1.5">
      <Rail>{historyIcon(entry)}</Rail>
      <UserAvatar name={name} size={28} />
      <Box flex="1" minWidth="0" textStyle="sm" color="fg.muted" pt="1" lineHeight="1.6">
        <Text as="span" fontWeight="semibold" color="fg">
          {name}
        </Text>{' '}
        {action}
        {/* Phones: time under the text instead of a column. */}
        <Box display={{ base: 'block', sm: 'none' }}>
          <Time value={entry.created_at} />
        </Box>
      </Box>
      <Box pt="1" flexShrink={0} display={{ base: 'none', sm: 'block' }}>
        <Time value={entry.created_at} />
      </Box>
    </HStack>
  )
}

function NoteRow({ note }: { note: Note }) {
  const name = personName(note.reporter)
  return (
    <HStack align="flex-start" gap="3" py="1.5">
      <Flex width="24px" flexShrink={0} justify="center" position="relative" zIndex="1">
        <Box borderRadius="full" outline="3px solid" outlineColor="bg.panel">
          <UserAvatar name={name} size={30} />
        </Box>
      </Flex>
      <Box flex="1" minWidth="0" ms="2" borderWidth="1px" borderRadius="l2" bg="bg.panel">
        <HStack
          px="4"
          py="2.5"
          gap="2"
          columnGap="2"
          rowGap="0"
          wrap="wrap"
          borderBottomWidth="1px"
        >
          <Text textStyle="sm" fontWeight="semibold">
            {name}
          </Text>
          <Text textStyle="sm" color="fg.muted">
            đã ghi chú
          </Text>
          <Box ms="auto">
            <Time value={note.created_at} />
          </Box>
        </HStack>
        <Text px="4" py="3" textStyle="sm" lineHeight="1.7" whiteSpace="pre-wrap">
          {note.text}
        </Text>
      </Box>
    </HStack>
  )
}

interface Props {
  notes: Note[]
  history: HistoryEntry[]
  me?: string
  busy: boolean
  onAddNote: (text: string) => Promise<boolean>
  onAttach?: () => void
}

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'note', label: 'Ghi chú' },
  { value: 'history', label: 'Lịch sử' }
] as const

export default function IssueActivity({ notes, history, me, busy, onAddNote, onAttach }: Props) {
  const [tab, setTab] = useState<string>('all')
  const [draft, setDraft] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)

  const items = useMemo<Item[]>(
    () =>
      [
        ...notes.map(note => ({ kind: 'note' as const, at: note.created_at, note })),
        // Note additions already show up as notes.
        ...history
          .filter(entry => entry.type?.name !== 'note-added')
          .map(entry => ({ kind: 'history' as const, at: entry.created_at, entry }))
      ].sort((a, b) => a.at.localeCompare(b.at)),
    [notes, history]
  )
  const counts = { all: items.length, note: notes.length, history: items.length - notes.length }
  const shown = tab === 'all' ? items : items.filter(i => i.kind === tab)

  const insert = (text: string) => {
    setDraft(d => d + text)
    textarea.current?.focus()
  }

  const submit = async () => {
    if (!draft.trim()) return
    if (await onAddNote(draft.trim())) setDraft('')
  }

  return (
    <Card.Root variant="outline">
      <Card.Header
        flexDirection="row"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap="3"
        py="0"
        borderBottomWidth="1px"
      >
        <HStack gap="2.5" py="4">
          <Box color="brand.fg">
            <LuMessageSquareText size={20} />
          </Box>
          <Card.Title textStyle="md">Hoạt động</Card.Title>
        </HStack>
        <Tabs.Root
          value={tab}
          onValueChange={e => setTab(e.value)}
          variant="line"
          size="sm"
          alignSelf="flex-end"
        >
          <Tabs.List borderBottomWidth="0" gap="2">
            {TABS.map(t => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                px="3"
                py="3"
                height="auto"
                whiteSpace="nowrap"
                color="fg.muted"
                _selected={{ color: 'brand.fg', fontWeight: 'semibold' }}
              >
                {t.label} ({counts[t.value]})
              </Tabs.Trigger>
            ))}
            <Tabs.Indicator bg="brand.solid" height="2px" bottom="0" />
          </Tabs.List>
        </Tabs.Root>
      </Card.Header>
      <Card.Body pt="4">
        {shown.length === 0 ? (
          <Text textStyle="sm" color="fg.muted" py="4" textAlign="center">
            {tab === 'note' ? 'Chưa có ghi chú nào.' : 'Chưa có hoạt động nào.'}
          </Text>
        ) : (
          <Box position="relative">
            {/* Timeline rail behind the icons. */}
            <Box position="absolute" left="11px" top="3" bottom="3" width="1px" bg="border" />
            <Stack gap="1.5">
              {shown.map((item, i) =>
                item.kind === 'note' ? (
                  <NoteRow key={`n${item.note.id}`} note={item.note} />
                ) : (
                  <HistoryRow key={`h${i}${item.at}`} entry={item.entry} />
                )
              )}
            </Stack>
          </Box>
        )}
      </Card.Body>

      <Box borderTopWidth="1px" px="5" py="4">
        <HStack align="flex-start" gap="3">
          <UserAvatar name={me} size={34} />
          <Stack flex="1" minWidth="0" gap="2.5">
            <Textarea
              ref={textarea}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void submit()
                }
              }}
              placeholder="Viết ghi chú, cập nhật tiến độ…"
              rows={1}
              autoresize
              maxHeight="240px"
              bg="bg.panel"
            />
            <HStack gap="1" wrap="wrap">
              <Tooltip content="Nhắc tên">
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorPalette="gray"
                  aria-label="Nhắc tên"
                  onClick={() => insert('@')}
                >
                  <LuAtSign />
                </IconButton>
              </Tooltip>
              {onAttach && (
                <Tooltip content="Đính kèm tệp">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorPalette="gray"
                    aria-label="Đính kèm tệp"
                    onClick={onAttach}
                  >
                    <LuPaperclip />
                  </IconButton>
                </Tooltip>
              )}
              <Popover.Root positioning={{ placement: 'top-start' }}>
                <Popover.Trigger asChild>
                  <IconButton size="sm" variant="ghost" colorPalette="gray" aria-label="Biểu tượng">
                    <LuSmile />
                  </IconButton>
                </Popover.Trigger>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content width="auto">
                      <Popover.Body p="2">
                        <SimpleGrid columns={6} gap="1">
                          {EMOJIS.map(emoji => (
                            <IconButton
                              key={emoji}
                              size="sm"
                              variant="ghost"
                              colorPalette="gray"
                              aria-label={emoji}
                              fontSize="lg"
                              onClick={() => insert(emoji)}
                            >
                              {emoji}
                            </IconButton>
                          ))}
                        </SimpleGrid>
                      </Popover.Body>
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
              <Text textStyle="xs" color="fg.muted" ms="2" display={{ base: 'none', md: 'block' }}>
                Ctrl + Enter để gửi · Shift + Enter để xuống dòng
              </Text>
              <Button ms="auto" onClick={submit} disabled={busy || !draft.trim()}>
                <LuSend /> Gửi ghi chú
              </Button>
            </HStack>
          </Stack>
        </HStack>
      </Box>
    </Card.Root>
  )
}
