'use client'

import AddTaskIcon from '@mui/icons-material/AddTask'
import BoltIcon from '@mui/icons-material/Bolt'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useMemo, useState, type FormEvent } from 'react'

import CategorySelect from '@/components/CategorySelect'
import PriorityBadge from '@/components/PriorityBadge'
import ProjectSelect from '@/components/ProjectSelect'
import { toLocalIso } from '@/lib/format'
import { defaultCategory, findProjectById } from '@/lib/projects'
import { getErrorMessage } from '@/services/httpService'
import RequestServices from '@/services/requestServices'
import { PRIORITIES, type CurrentUser, type Project } from '@/services/types'

interface Props {
  projects: Project[]
  me: CurrentUser | null
  date: string
  onDateChange: (date: string) => void
  onCreated: (id?: number) => void
}

export default function QuickCreateForm({ projects, me, date, onDateChange, onCreated }: Props) {
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Default to the first project until the user picks one.
  const effectiveProjectId = projectId || (projects[0] ? String(projects[0].id) : '')
  const categories = useMemo(
    () => findProjectById(projects, effectiveProjectId)?.categories ?? [],
    [projects, effectiveProjectId]
  )
  const effectiveCategory = category || defaultCategory(categories)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await RequestServices.postNewRequest({
        summary: summary.trim(),
        // Mantis requires a description, fall back to the summary.
        description: description.trim() || summary.trim(),
        project: { id: Number(effectiveProjectId) },
        category: effectiveCategory ? { name: effectiveCategory } : undefined,
        priority: { name: priority },
        handler: me ? { id: me.id } : undefined,
        due_date: date ? toLocalIso(date) : undefined
      })
      setSummary('')
      setDescription('')
      onCreated(res?.issue?.id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack component="form" onSubmit={submit} spacing={2}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: t => t.alpha((t.vars || t).palette.primary.main, 0.12)
          }}
        >
          <BoltIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
            Tạo việc nhanh
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Giao cho {me ? me.real_name || me.name : '…'}
          </Typography>
        </Box>
      </Stack>
      <TextField
        required
        label="Tiêu đề"
        value={summary}
        onChange={e => setSummary(e.target.value)}
      />
      <TextField
        label="Mô tả"
        value={description}
        onChange={e => setDescription(e.target.value)}
        multiline
        minRows={2}
      />
      <TextField
        required

        type="date"
        label="Hạn xử lý"
        value={date}
        onChange={e => onDateChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <ProjectSelect
        required
        projects={projects}
        value={effectiveProjectId}
        onChange={id => {
          setProjectId(id)
          setCategory('')
        }}
      />
      <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={2}>
        <CategorySelect categories={categories} value={effectiveCategory} onChange={setCategory} />
        <TextField
          select
          label="Ưu tiên"
          value={priority}
          onChange={e => setPriority(e.target.value)}
          fullWidth
        >
          {PRIORITIES.map(p => (
            <MenuItem key={p.id} value={p.name}>
              <PriorityBadge priority={p} />
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        startIcon={<AddTaskIcon />}
        disabled={submitting || !summary.trim() || !effectiveProjectId}
      >
        {submitting ? 'Đang tạo…' : 'Tạo việc'}
      </Button>
    </Stack>
  )
}
