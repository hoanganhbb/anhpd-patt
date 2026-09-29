'use client'

import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { useMemo } from 'react'

import { flattenProjects, type ProjectOption } from '@/lib/projects'
import { normalize } from '@/lib/text'
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
  sx?: object
}

const filter = createFilterOptions<ProjectOption>({
  stringify: o => normalize(`${o.path} ${o.id}`)
})

export default function ProjectSelect({
  projects,
  value,
  onChange,
  label = 'Dự án',
  placeholder = 'Tìm dự án…',
  required,
  clearable,
  sx
}: Props) {
  const options = useMemo(() => flattenProjects(projects), [projects])
  const selected = options.find(o => o.id === value) ?? null

  return (
    <Autocomplete
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option?.id ?? '')}
      getOptionLabel={o => o.path}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts, state) =>
        filter(opts, { ...state, inputValue: normalize(state.inputValue) })
      }
      disableClearable={!clearable}
      autoHighlight
      noOptionsText="Không tìm thấy dự án"
      sx={sx}
      renderOption={({ key, ...props }, option) => (
        <Box
          component="li"
          key={key}
          {...props}
          sx={{ pl: `${16 + option.depth * 16}px !important` }}
        >
          <FolderOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          {option.name}
        </Box>
      )}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={selected ? undefined : placeholder}
          required={required}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: 0.5 }}>
                  <FolderOutlinedIcon fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />
      )}
    />
  )
}
