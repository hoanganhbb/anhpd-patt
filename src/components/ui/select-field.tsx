'use client'

import {
  createListCollection,
  HStack,
  Portal,
  Select,
  type SystemStyleObject
} from '@chakra-ui/react'
import { useMemo, type ReactNode } from 'react'

import { Field } from './field'

export interface SelectOption {
  value: string
  label: string
  // Rich rendering in the list and trigger (falls back to the label).
  render?: ReactNode
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  label?: ReactNode
  placeholder?: string
  helperText?: ReactNode
  required?: boolean
  disabled?: boolean
  width?: SystemStyleObject['width']
  minWidth?: SystemStyleObject['minWidth']
}

// Ark's collection treats '' as "no value", so an explicit empty option needs a stand-in.
const EMPTY = '__empty__'
const toKey = (value: string) => value || EMPTY
const fromKey = (key: string | undefined) => (key === EMPTY ? '' : (key ?? ''))

export function SelectField({
  options,
  value,
  onChange,
  label,
  placeholder,
  helperText,
  required,
  disabled,
  width,
  minWidth
}: Props) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: options.map(o => ({ ...o, value: toKey(o.value) })),
        itemToString: o => o.label,
        itemToValue: o => o.value
      }),
    [options]
  )
  const selected = collection.items.find(o => o.value === toKey(value))

  return (
    <Field
      label={label}
      helperText={helperText}
      required={required}
      disabled={disabled}
      width={width}
      minWidth={minWidth}
    >
      <Select.Root
        collection={collection}
        value={selected ? [selected.value] : []}
        onValueChange={e => onChange(fromKey(e.value[0]))}
        positioning={{ sameWidth: true }}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger bg="bg.panel">
            {selected?.render ? (
              <HStack gap="2" minWidth="0">
                {selected.render}
              </HStack>
            ) : (
              <Select.ValueText placeholder={placeholder} />
            )}
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {collection.items.map(item => (
                <Select.Item item={item} key={item.value}>
                  {item.render ?? item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Field>
  )
}
