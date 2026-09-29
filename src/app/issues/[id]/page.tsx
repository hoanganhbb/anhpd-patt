'use client'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DeleteIcon from '@mui/icons-material/Delete'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PushPinIcon from '@mui/icons-material/PushPin'
import SaveIcon from '@mui/icons-material/Save'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import PriorityBadge from '@/components/PriorityBadge'
import StatusChip from '@/components/StatusChip'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/services/httpService'
import { toUserOptions, type UserOption } from '@/services/normalize'
import RequestServices from '@/services/requestServices'
import { PRIORITIES, STATUSES, type Attachment, type Issue } from '@/services/types'

type Feedback = { severity: 'success' | 'error'; text: string } | null

const formatDate = (value?: string) => formatDateTime(value) || '—'

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Grid size={{ xs: 6, md: 3 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ mt: 0.5, fontWeight: 500 }}>
      {children || '—'}
    </Typography>
  </Grid>
)

const Person = ({ name }: { name?: string }) =>
  name ? (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <UserAvatar name={name} size={24} />
      <span>{name}</span>
    </Stack>
  ) : null

const downloadBase64 = (file: { content: string; filename: string; content_type?: string }) => {
  const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: file.content_type }))
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [permission, setPermission] = useState<unknown>(null)
  const [handlers, setHandlers] = useState<UserOption[]>([])
  const [edit, setEdit] = useState({ status: '', handler: '', priority: '' })
  const [note, setNote] = useState('')
  const [remind, setRemind] = useState<{ open: boolean; text: string }>({ open: false, text: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const load = useCallback(
    () =>
      RequestServices.getDetailIssue(id)
        .then(res => {
          const data = res.issues?.[0] ?? null
          setIssue(data)
          setEdit({
            status: String(data?.status?.id ?? ''),
            handler: String(data?.handler?.id ?? ''),
            priority: data?.priority?.name ?? ''
          })
        })
        .catch(err => setFeedback({ severity: 'error', text: getErrorMessage(err) }))
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    load()
    RequestServices.getPermissionRequest(id)
      .then(setPermission)
      .catch(err => setPermission({ error: getErrorMessage(err) }))
    RequestServices.getLstHandlerRequest(id)
      .then(data => setHandlers(toUserOptions(data)))
      .catch(() => setHandlers([]))
  }, [id, load])

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    setFeedback(null)
    try {
      await action()
      setFeedback({ severity: 'success', text: success })
      await load()
    } catch (err) {
      setFeedback({ severity: 'error', text: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(
      () =>
        RequestServices.updateRequest({
          id,
          data: {
            status: edit.status ? { id: Number(edit.status) } : undefined,
            handler: edit.handler ? { id: Number(edit.handler) } : undefined,
            priority: edit.priority ? { name: edit.priority } : undefined
          }
        }),
      'Đã cập nhật công việc'
    )

  const addNote = () =>
    run(async () => {
      await RequestServices.addNoteRequest({
        id,
        data: { text: note, view_state: { name: 'public' } }
      })
      setNote('')
    }, 'Đã thêm ghi chú')

  const isMonitoring = Boolean(
    permission && typeof permission === 'object' && 'is_monitoring' in permission
      ? (permission as { is_monitoring: unknown }).is_monitoring
      : false
  )

  const toggleMonitor = () =>
    run(
      () =>
        isMonitoring
          ? RequestServices.deleteMonitorRequest(id)
          : RequestServices.addMonitorRequest(id),
      isMonitoring ? 'Đã bỏ theo dõi' : 'Đã theo dõi'
    ).then(() =>
      RequestServices.getPermissionRequest(id)
        .then(setPermission)
        .catch(() => {})
    )

  const toggleSticky = () =>
    run(
      () => RequestServices.toggleStickRequest({ id: Number(id), sticky: !issue?.sticky }),
      issue?.sticky ? 'Đã bỏ ghim' : 'Đã ghim'
    )

  const sendRemind = () =>
    run(async () => {
      await RequestServices.addRemindRequest({ id: Number(id), note: remind.text })
      setRemind({ open: false, text: '' })
    }, 'Đã gửi nhắc việc')

  const remove = async () => {
    if (!window.confirm(`Xoá công việc #${id}? Hành động này không thể hoàn tác.`)) return
    setBusy(true)
    try {
      await RequestServices.deleteRequest(id)
      router.push('/')
    } catch (err) {
      setFeedback({ severity: 'error', text: getErrorMessage(err) })
      setBusy(false)
    }
  }

  const download = async (file: Attachment) => {
    try {
      const res = (await RequestServices.getDetailIssueFiles({
        idRequest: id,
        idFile: file.id
      })) as {
        files?: { content: string; filename: string; content_type?: string }[]
      }
      const content = res.files?.[0]
      if (!content?.content) throw new Error('Tệp không có nội dung')
      downloadBase64(content)
    } catch (err) {
      setFeedback({ severity: 'error', text: getErrorMessage(err) })
    }
  }

  if (loading) return <CircularProgress />
  if (!issue)
    return (
      <Stack spacing={2}>
        {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}
        <Button component={Link} href="/" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'start' }}>
          Quay lại
        </Button>
      </Stack>
    )

  const handlerOptions =
    issue.handler && !handlers.some(h => h.id === issue.handler?.id)
      ? [
          {
            id: issue.handler.id,
            name: issue.handler.name,
            label: issue.handler.real_name || issue.handler.name
          },
          ...handlers
        ]
      : handlers

  return (
    <Stack spacing={2}>
      <Box>
        <Button
          component={Link}
          href="/"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 1, ml: -1, color: 'text.secondary' }}
        >
          Danh sách công việc
        </Button>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          useFlexGap
        >
          <Typography
            sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', fontSize: 18 }}
          >
            #{issue.id}
          </Typography>
          <StatusChip status={issue.status} />
          {issue.sticky && (
            <Chip size="small" color="warning" icon={<PushPinIcon />} label="Đã ghim" />
          )}
        </Stack>
        <Typography variant="h4" component="h1" sx={{ mt: 0.5, fontSize: { xs: 22, md: 28 } }}>
          {issue.summary}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={isMonitoring ? <VisibilityOffIcon /> : <VisibilityIcon />}
          onClick={toggleMonitor}
          disabled={busy}
        >
          {isMonitoring ? 'Bỏ theo dõi' : 'Theo dõi'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<PushPinIcon />}
          onClick={toggleSticky}
          disabled={busy}
        >
          {issue.sticky ? 'Bỏ ghim' : 'Ghim'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<NotificationsActiveIcon />}
          onClick={() => setRemind({ open: true, text: '' })}
          disabled={busy}
        >
          Nhắc việc
        </Button>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={remove}
          disabled={busy}
        >
          Xoá
        </Button>
      </Stack>

      {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2}>
            <Field label="Dự án">{issue.project?.name}</Field>
            <Field label="Danh mục">{issue.category?.name}</Field>
            <Field label="Trạng thái">
              <StatusChip status={issue.status} />
            </Field>
            <Field label="Ưu tiên">
              <PriorityBadge priority={issue.priority} />
            </Field>
            <Field label="Người báo cáo">
              <Person name={issue.reporter?.real_name || issue.reporter?.name} />
            </Field>
            <Field label="Người xử lý">
              <Person name={issue.handler?.real_name || issue.handler?.name} />
            </Field>
            <Field label="Ngày tạo">{formatDate(issue.created_at)}</Field>
            <Field label="Cập nhật">{formatDate(issue.updated_at)}</Field>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Mô tả
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {issue.description}
          </Typography>
          {issue.additional_information && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                Thông tin thêm
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {issue.additional_information}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Cập nhật
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              size="small"
              label="Trạng thái"
              value={edit.status}
              onChange={e => setEdit(s => ({ ...s, status: e.target.value }))}
              sx={{ minWidth: 180 }}
            >
              {STATUSES.map(s => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Người xử lý"
              value={edit.handler}
              onChange={e => setEdit(s => ({ ...s, handler: e.target.value }))}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="">(Không đổi)</MenuItem>
              {handlerOptions.map(h => (
                <MenuItem key={h.id} value={String(h.id)}>
                  {h.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Ưu tiên"
              value={edit.priority}
              onChange={e => setEdit(s => ({ ...s, priority: e.target.value }))}
              sx={{ minWidth: 160 }}
            >
              {PRIORITIES.map(p => (
                <MenuItem key={p.id} value={p.name}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>
              Lưu
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {!!issue.attachments?.length && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1">Tệp đính kèm</Typography>
            <List dense>
              {issue.attachments.map(file => (
                <ListItemButton key={file.id} onClick={() => download(file)}>
                  <ListItemIcon>
                    <AttachFileIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.filename}
                    secondary={`${(file.size / 1024).toFixed(1)} KB`}
                  />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Ghi chú ({issue.notes?.length ?? 0})
          </Typography>
          <Stack spacing={2} divider={<Divider flexItem />}>
            {issue.notes?.map(n => (
              <Stack key={n.id} direction="row" spacing={1.5}>
                <UserAvatar name={n.reporter?.real_name || n.reporter?.name} size={32} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {n.reporter?.real_name || n.reporter?.name}{' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      · {formatDate(n.created_at)}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>
                    {n.text}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <TextField
              label="Thêm ghi chú"
              value={note}
              onChange={e => setNote(e.target.value)}
              multiline
              minRows={3}
            />
            <Button
              variant="contained"
              onClick={addNote}
              disabled={busy || !note.trim()}
              sx={{ alignSelf: 'start' }}
            >
              Gửi ghi chú
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary>
          <Typography variant="body2">Quyền trên công việc (dữ liệu thô)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <pre style={{ margin: 0, fontSize: 12, overflowX: 'auto' }}>
            {JSON.stringify(permission, null, 2)}
          </pre>
        </AccordionDetails>
      </Accordion>

      <Dialog open={remind.open} onClose={() => setRemind({ open: false, text: '' })} fullWidth>
        <DialogTitle>Nhắc việc #{issue.id}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nội dung nhắc"
            value={remind.text}
            onChange={e => setRemind(r => ({ ...r, text: e.target.value }))}
            multiline
            minRows={3}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemind({ open: false, text: '' })}>Huỷ</Button>
          <Button variant="contained" onClick={sendRemind} disabled={busy}>
            Gửi
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
