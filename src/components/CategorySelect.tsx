'use client'

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

import { normalize } from '@/lib/text'
import type { Ref } from '@/services/types'

interface Props {
  categories: Ref[]
  value: string
  onChange: (name: string) => void
  label?: string
}

const filter = createFilterOptions<string>({ stringify: normalize })

// Category picker with accent-insensitive text search.
export default function CategorySelect({ categories, value, onChange, label = 'Danh mục' }: Props) {
  const names = [...new Set(categories.map(c => c.name))]
  return (
    <Autocomplete
      options={names}
      value={value || null}
      onChange={(_, name) => onChange(name ?? '')}
      filterOptions={(opts, state) =>
        filter(opts, { ...state, inputValue: normalize(state.inputValue) })
      }
      disabled={!names.length}
      autoHighlight
      noOptionsText="Không tìm thấy danh mục"
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={names.length ? 'Tìm danh mục…' : 'Dự án chưa có danh mục'}
        />
      )}
    />
  )
}
