'use client'

import SendIcon from '@mui/icons-material/Send'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import CategorySelect from '@/components/CategorySelect'
import PageHeader from '@/components/PageHeader'
import PriorityBadge from '@/components/PriorityBadge'
import ProjectSelect from '@/components/ProjectSelect'
import UserAvatar from '@/components/UserAvatar'
import { defaultCategory, findProjectById } from '@/lib/projects'
import { getErrorMessage } from '@/services/httpService'
import { toUserOptions, type UserOption } from '@/services/normalize'
import RequestServices from '@/services/requestServices'
import { PRIORITIES, type Project } from '@/services/types'

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

  return (
    <Box component="form" onSubmit={submit}>
      <PageHeader
        title="Tạo công việc"
        subtitle="Mô tả rõ yêu cầu để người xử lý nắm được ngay"
        actions={
          <>
            <Button onClick={() => router.back()}>Huỷ</Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SendIcon />}
              disabled={submitting}
            >
              {submitting ? 'Đang gửi…' : 'Tạo công việc'}
            </Button>
          </>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="subtitle1">Nội dung</Typography>
                <TextField
                  required
                  label="Tiêu đề"
                  placeholder="VD: Lỗi không đăng nhập được trên ứng dụng"
                  value={form.summary}
                  onChange={set('summary')}
                  fullWidth
                />
                <TextField
                  required
                  label="Mô tả"
                  placeholder="Mô tả chi tiết, các bước tái hiện, kết quả mong muốn…"
                  value={form.description}
                  onChange={set('description')}
                  multiline
                  minRows={8}
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Typography variant="subtitle1">Phân loại</Typography>
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
                <TextField
                  select
                  label="Mức ưu tiên"
                  value={form.priority}
                  onChange={set('priority')}
                  fullWidth
                >
                  {PRIORITIES.map(p => (
                    <MenuItem key={p.id} value={p.name}>
                      <PriorityBadge priority={p} />
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Người xử lý"
                  value={form.handlerId}
                  onChange={set('handlerId')}
                  disabled={!handlers.length}
                  helperText={
                    form.projectId && !handlers.length ? 'Dự án chưa có người xử lý' : ' '
                  }
                  fullWidth
                >
                  <MenuItem value="">(Chưa giao)</MenuItem>
                  {handlers.map(h => (
                    <MenuItem key={h.id} value={String(h.id)}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <UserAvatar name={h.label} size={22} />
                        <span>{h.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
