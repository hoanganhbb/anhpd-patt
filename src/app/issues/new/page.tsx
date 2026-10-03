'use client'

import { Box, Button, Grid, GridItem, Input, Stack, Textarea } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LuFileText, LuSend, LuTags } from 'react-icons/lu'

import CategorySelect from '@/components/CategorySelect'
import PageHeader from '@/components/PageHeader'
import PriorityBadge from '@/components/PriorityBadge'
import ProjectSelect from '@/components/ProjectSelect'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/ui/field'
import { Panel } from '@/components/ui/panel'
import { SelectField } from '@/components/ui/select-field'
import UserAvatar from '@/components/UserAvatar'
import { defaultCategory, findProjectById } from '@/lib/projects'
import { getErrorMessage } from '@/services/httpService'
import { toUserOptions, type UserOption } from '@/services/normalize'
import RequestServices from '@/services/requestServices'
import { PRIORITIES, type Project } from '@/services/types'

const PRIORITY_OPTIONS = PRIORITIES.map(p => ({
  value: p.name,
  label: p.label ?? p.name,
  render: <PriorityBadge priority={p} />
}))

export default function NewIssuePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [handlers, setHandlers] = useState<UserOption[]>([])
  const [form, setForm] = useState({
    projectId: '',
    category: '',
    summary: '',
    description: '',
    priority: 'normal',
    handlerId: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    RequestServices.getProjectList()
      .then(res => setProjects(res.projects ?? []))
      .catch(err => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => {
    if (!form.projectId) return
    RequestServices.getLstHandlerProject(form.projectId)
      .then(data => setHandlers(toUserOptions(data)))
      .catch(() => setHandlers([]))
  }, [form.projectId])

  const categories = useMemo(
    () => findProjectById(projects, form.projectId)?.categories ?? [],
    [projects, form.projectId]
  )
  // Until the user picks one, use "Tùy biến chức năng" (or the first category).
  const category = form.category || defaultCategory(categories)

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await RequestServices.postNewRequest({
        summary: form.summary,
        description: form.description,
        project: { id: Number(form.projectId) },
        category: category ? { name: category } : undefined,
        priority: { name: form.priority },
        handler: form.handlerId ? { id: Number(form.handlerId) } : undefined
      })
      router.push(res?.issue?.id ? `/issues/${res.issue.id}` : '/')
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  const handlerOptions = [
    { value: '', label: '(Chưa giao)' },
    ...handlers.map(h => ({
      value: String(h.id),
      label: h.label,
      render: (
        <>
          <UserAvatar name={h.label} size={22} />
          <span>{h.label}</span>
        </>
      )
    }))
  ]

  return (
    <Box as="form" onSubmit={submit}>
      <PageHeader
        title="Tạo công việc"
        subtitle="Mô tả rõ yêu cầu để người xử lý nắm được ngay"
        actions={
          <>
            <Button variant="ghost" onClick={() => router.back()}>
              Huỷ
            </Button>
            <Button type="submit" loading={submitting} loadingText="Đang gửi…">
              <LuSend /> Tạo công việc
            </Button>
          </>
        }
      />
      {error && (
        <Alert status="error" mb="4">
          {error}
        </Alert>
      )}
      <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap="5">
        <GridItem minWidth="0">
          <Panel icon={<LuFileText />} title="Nội dung">
            <Stack gap="5">
              <Field label="Tiêu đề" required>
                <Input
                  bg="bg.panel"
                  placeholder="VD: Lỗi không đăng nhập được trên ứng dụng"
                  value={form.summary}
                  onChange={set('summary')}
                />
              </Field>
              <Field label="Mô tả" required>
                <Textarea
                  bg="bg.panel"
                  placeholder="Mô tả chi tiết, các bước tái hiện, kết quả mong muốn…"
                  value={form.description}
                  onChange={set('description')}
                  rows={8}
                  autoresize
                />
              </Field>
            </Stack>
          </Panel>
        </GridItem>
        <GridItem minWidth="0">
          <Panel icon={<LuTags />} title="Phân loại">
            <Stack gap="5">
              <ProjectSelect
                required
                projects={projects}
                value={form.projectId}
                onChange={id =>
                  setForm(f => ({ ...f, projectId: id, category: '', handlerId: '' }))
                }
              />
              <CategorySelect
                categories={categories}
                value={category}
                onChange={name => setForm(f => ({ ...f, category: name }))}
              />
              <SelectField
                label="Mức ưu tiên"
                options={PRIORITY_OPTIONS}
                value={form.priority}
                onChange={priority => setForm(f => ({ ...f, priority }))}
              />
              <SelectField
                label="Người xử lý"
                options={handlerOptions}
                value={form.handlerId}
                onChange={handlerId => setForm(f => ({ ...f, handlerId }))}
                disabled={!handlers.length}
                helperText={
                  form.projectId && !handlers.length ? 'Dự án chưa có người xử lý' : undefined
                }
              />
            </Stack>
          </Panel>
        </GridItem>
      </Grid>
    </Box>
  )
}
