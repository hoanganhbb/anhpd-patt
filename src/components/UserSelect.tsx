'use client'

import { Combobox, createListCollection, HStack, InputGroup, Portal, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuUserRound } from 'react-icons/lu'

import { matchesText } from '@/lib/text'
import type { UserOption } from '@/services/normalize'

import UserAvatar from './UserAvatar'

interface Props {
  users: UserOption[]
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

// Searchable user picker (accent-insensitive) with avatars.
export default function UserSelect({
  users,
  value,
  onChange,
  label,
  placeholder = 'Tìm người…',
  disabled
}: Props) {
  const selected = users.find(u => String(u.id) === value)
  // What the user is typing; null shows the selected user's name instead.
  const [query, setQuery] = useState<string | null>(null)

  const collection = useMemo(
    () =>
      createListCollection({
        items: query ? users.filter(u => matchesText(u.label, query)) : users,
        itemToString: u => u.label,
        itemToValue: u => String(u.id)
      }),
    [users, query]
  )

  return (
    <Combobox.Root
      collection={collection}
      value={selected ? [value] : []}
      inputValue={query ?? selected?.label ?? ''}
      onInputValueChange={e => setQuery(e.reason === 'input-change' ? e.inputValue : null)}
      onValueChange={e => {
        setQuery(null)
        onChange(e.value[0] ?? '')
      }}
      onOpenChange={e => !e.open && setQuery(null)}
      openOnClick
      disabled={disabled}
      width="100%"
    >
      {label && <Combobox.Label>{label}</Combobox.Label>}
      <Combobox.Control>
        <InputGroup
          startElement={
            selected && query === null ? (
              <UserAvatar name={selected.label} size={24} />
            ) : (
              <LuUserRound />
            )
          }
        >
          <Combobox.Input placeholder={placeholder} bg="bg.panel" />
        </InputGroup>
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxHeight="320px">
            <Combobox.Empty>Không tìm thấy người dùng</Combobox.Empty>
            {collection.items.map(user => (
              <Combobox.Item item={user} key={user.id} justifyContent="flex-start">
                <HStack gap="2" minWidth="0" flex="1">
                  <UserAvatar name={user.label} size={22} />
                  <Text as="span" truncate>
                    {user.label}
                  </Text>
                </HStack>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  )
}
