'use client'

import { Button, Input, Stack, Textarea } from '@chakra-ui/react'
import { useMemo, useState, type FormEvent } from 'react'
import { LuListPlus } from 'react-icons/lu'

import CategorySelect from '@/components/CategorySelect'
import PriorityBadge from '@/components/PriorityBadge'
import ProjectSelect from '@/components/ProjectSelect'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/ui/field'
import { SelectField } from '@/components/ui/select-field'
import { toLocalIso } from '@/lib/format'
import { defaultCategory, findProjectById } from '@/lib/projects'
import { getErrorMessage } from '@/services/httpService'
import RequestServices from '@/services/requestServices'
import { PRIORITIES, type CurrentUser, type Project } from '@/services/types'

const PRIORITY_OPTIONS = PRIORITIES.map(p => ({
  value: p.name,
  label: p.label ?? p.name,
  render: <PriorityBadge priority={p} />
}))

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
    <Stack as="form" onSubmit={submit} gap="4">
      <Field label="Tiêu đề" required>
        <Input bg="bg.panel" value={summary} onChange={e => setSummary(e.target.value)} />
      </Field>
      <Field label="Mô tả">
        <Textarea
          bg="bg.panel"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          autoresize
        />
      </Field>
      <Field label="Hạn xử lý" required>
        <Input
          bg="bg.panel"
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
        />
      </Field>
      <ProjectSelect
        required
        projects={projects}
        value={effectiveProjectId}
        onChange={id => {
          setProjectId(id)
          setCategory('')
        }}
      />
      <Stack direction={{ base: 'column', sm: 'row', lg: 'column' }} gap="4">
        <CategorySelect categories={categories} value={effectiveCategory} onChange={setCategory} />
        <SelectField
          label="Ưu tiên"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={setPriority}
        />
      </Stack>
      {error && <Alert status="error">{error}</Alert>}
      <Button
        type="submit"
        loading={submitting}
        loadingText="Đang tạo…"
        disabled={!summary.trim() || !effectiveProjectId}
      >
        <LuListPlus /> Tạo việc
      </Button>
    </Stack>
  )
}
