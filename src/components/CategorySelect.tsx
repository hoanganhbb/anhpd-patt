'use client'

import { Combobox, createListCollection, Portal } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

import { matchesText } from '@/lib/text'
import type { Ref } from '@/services/types'

interface Props {
  categories: Ref[]
  value: string
  onChange: (name: string) => void
  label?: string
}

// Category picker with accent-insensitive text search.
export default function CategorySelect({ categories, value, onChange, label = 'Danh mục' }: Props) {
  const names = useMemo(() => [...new Set(categories.map(c => c.name))], [categories])
  // What the user is typing; null shows the selected category instead.
  const [query, setQuery] = useState<string | null>(null)

  const collection = useMemo(
    () =>
      createListCollection({
        items: query ? names.filter(n => matchesText(n, query)) : names
      }),
    [names, query]
  )

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []}
      inputValue={query ?? value}
      onInputValueChange={e => setQuery(e.reason === 'input-change' ? e.inputValue : null)}
      onValueChange={e => {
        setQuery(null)
        onChange(e.value[0] ?? '')
      }}
      onOpenChange={e => !e.open && setQuery(null)}
      openOnClick
      disabled={!names.length}
      width="100%"
    >
      <Combobox.Label>{label}</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input
          placeholder={names.length ? 'Tìm danh mục…' : 'Dự án chưa có danh mục'}
          bg="bg.panel"
        />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxHeight="320px">
            <Combobox.Empty>Không tìm thấy danh mục</Combobox.Empty>
            {collection.items.map(name => (
              <Combobox.Item item={name} key={name}>
                {name}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  )
}
