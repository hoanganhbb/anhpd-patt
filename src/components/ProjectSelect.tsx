'use client'

import {
  Combobox,
  createListCollection,
  InputGroup,
  Portal,
  type SystemStyleObject,
  Text
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuFolder } from 'react-icons/lu'

import { flattenProjects } from '@/lib/projects'
import { matchesText } from '@/lib/text'
import type { Project } from '@/services/types'

interface Props {
  projects: Project[]
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  // Allow clearing the value (e.g. "all projects" in a filter).
  clearable?: boolean
  width?: SystemStyleObject['width']
}

export default function ProjectSelect({
  projects,
  value,
  onChange,
  label = 'Dự án',
  placeholder = 'Tìm dự án…',
  required,
  clearable,
  width
}: Props) {
  const options = useMemo(() => flattenProjects(projects), [projects])
  const selected = options.find(o => o.id === value)
  // What the user is typing; null shows the selected project's path instead.
  const [query, setQuery] = useState<string | null>(null)

  const collection = useMemo(
    () =>
      createListCollection({
        items: query ? options.filter(o => matchesText(`${o.path} ${o.id}`, query)) : options,
        itemToString: o => o.path,
        itemToValue: o => o.id
      }),
    [options, query]
  )

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []}
      inputValue={query ?? selected?.path ?? ''}
      onInputValueChange={e => setQuery(e.reason === 'input-change' ? e.inputValue : null)}
      onValueChange={e => {
        setQuery(null)
        if (e.value[0] || clearable) onChange(e.value[0] ?? '')
      }}
      onOpenChange={e => !e.open && setQuery(null)}
      openOnClick
      required={required}
      width={width}
    >
      {label && (
        <Combobox.Label>
          {label}
          {required && (
            <Text as="span" color="fg.error" aria-hidden>
              *
            </Text>
          )}
        </Combobox.Label>
      )}
      <Combobox.Control>
        <InputGroup startElement={<LuFolder />}>
          <Combobox.Input placeholder={placeholder} bg="bg.panel" />
        </InputGroup>
        <Combobox.IndicatorGroup>
          {clearable && <Combobox.ClearTrigger />}
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxHeight="320px">
            <Combobox.Empty>Không tìm thấy dự án</Combobox.Empty>
            {collection.items.map(option => (
              <Combobox.Item
                item={option}
                key={option.id}
                ps={`${12 + option.depth * 16}px`}
                justifyContent="flex-start"
                gap="2"
              >
                <LuFolder style={{ opacity: 0.6, flexShrink: 0 }} />
                <Combobox.ItemText>{option.name}</Combobox.ItemText>
                <Combobox.ItemIndicator ms="auto" />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  )
}
