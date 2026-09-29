'use client'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadIcon from '@mui/icons-material/Download'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

import PageHeader from '@/components/PageHeader'
import ProjectSelect from '@/components/ProjectSelect'
import { toLocalIso } from '@/lib/format'
import { MAX_ROWS } from '@/lib/importSchema'
import type { ImportRow } from '@/lib/importParser'
import { getErrorMessage } from '@/services/httpService'
import { toUserOptions, type UserOption } from '@/services/normalize'
import RequestServices from '@/services/requestServices'
import type { CurrentUser, Project } from '@/services/types'

const CONCURRENCY = 3

type Outcome =
  { state: 'running' } | { state: 'done'; id?: number } | { state: 'failed'; error: string }

const fetchHandlers = (projectId: string) =>
  RequestServices.getLstHandlerProject(projectId)
    .then(toUserOptions)
    .catch((): UserOption[] => [])

const download = (buffer: ArrayBuffer, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([buffer], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const userLabel = (u: CurrentUser) => (u.real_name ? `${u.real_name} (${u.name})` : u.name)

export default function ImportIssuesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [handlerProject, setHandlerProject] = useState('')
  const [downloading, setDownloading] = useState(false)

  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({})
  const [importing, setImporting] = useState(false)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const cancelled = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    RequestServices.getProjectList()
      .then(res => setProjects(res.projects ?? []))
      .catch(err => setError(getErrorMessage(err)))
    RequestServices.getCurrentUser()
      .then(user => setMe(user?.id ? user : null))
      .catch(() => setMe(null))
  }, [])

  const downloadTemplate = async () => {
    setDownloading(true)
    setError('')
    try {
      const [{ buildTemplate, TEMPLATE_FILE_NAME, XLSX_MIME }, fromProject] = await Promise.all([
        import('@/lib/importTemplate'),
        handlerProject ? fetchHandlers(handlerProject) : Promise.resolve<UserOption[]>([])
      ])
      const handlers = [...fromProject]
      if (me && !handlers.some(h => h.id === me.id)) {
        handlers.unshift({ id: me.id, name: me.name, label: userLabel(me) })
      }
      const source = projects.length
        ? (await import('@/lib/projects'))
            .flattenProjects(projects)
            .find(o => o.id === handlerProject)
        : undefined
      const buffer = await buildTemplate({
        projects,
        handlers,
        handlerSource: source?.name,
        generatedBy: me ? me.real_name || me.name : undefined
      })
      download(buffer, TEMPLATE_FILE_NAME, XLSX_MIME)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  const loadFile = useCallback(
    async (file: File) => {
      setError('')
      setRows([])
      setOutcomes({})
      setFileName(file.name)
      if (!/\.xlsx$/i.test(file.name)) {
        setError('Chỉ hỗ trợ tệp .xlsx. Hãy dùng tệp mẫu tải từ trang này.')
        return
      }
      setParsing(true)
      try {
        const { readWorkbook, projectsNeedingHandlers, resolveRows, ImportFileError } =
          await import('@/lib/importParser')
        let raws
        try {
          raws = await readWorkbook(await file.arrayBuffer())
        } catch (err) {
          setError(err instanceof ImportFileError ? err.message : getErrorMessage(err))
          return
        }
        if (!raws.length) {
          setError('Tệp không có dòng dữ liệu nào (dòng mẫu "VD" được bỏ qua).')
          return
        }
        if (raws.length > MAX_ROWS) {
          setError(
            `Tệp có ${raws.length} dòng, tối đa ${MAX_ROWS} dòng mỗi lần nhập. Hãy chia nhỏ tệp.`
          )
          return
        }
        const ids = projectsNeedingHandlers(raws, projects)
        const lists = await Promise.all(ids.map(fetchHandlers))
        const handlersByProject = Object.fromEntries(ids.map((id, i) => [id, lists[i]]))
        setRows(resolveRows(raws, { projects, handlersByProject, toDueDate: toLocalIso }))
      } finally {
        setParsing(false)
      }
    },
    [projects]
  )

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void loadFile(file)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void loadFile(file)
  }

  const valid = rows.filter(r => r.payload)
  const invalid = rows.length - valid.length
  const pending = valid.filter(r => outcomes[r.raw.row]?.state !== 'done')
  const doneCount = valid.length - pending.length
  const failedCount = Object.values(outcomes).filter(o => o.state === 'failed').length
  const finished = importing ? 0 : doneCount

  const runImport = async () => {
    cancelled.current = false
    setImporting(true)
    const queue = [...pending]
    const worker = async () => {
      for (let row = queue.shift(); row && !cancelled.current; row = queue.shift()) {
        const key = row.raw.row
        setOutcomes(o => ({ ...o, [key]: { state: 'running' } }))
        try {
          const res = await RequestServices.postNewRequest(row.payload)
          setOutcomes(o => ({ ...o, [key]: { state: 'done', id: res?.issue?.id } }))
        } catch (err) {
          setOutcomes(o => ({ ...o, [key]: { state: 'failed', error: getErrorMessage(err) } }))
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setImporting(false)
  }

  const reset = () => {
    setRows([])
    setOutcomes({})
    setFileName('')
    setError('')
  }

  const visible = onlyErrors
    ? rows.filter(r => !r.payload || outcomes[r.raw.row]?.state === 'failed')
    : rows
  const progress = valid.length ? (doneCount / valid.length) * 100 : 0
  const allDone = valid.length > 0 && doneCount === valid.length

  return (
    <>
      <PageHeader
        title="Nhập công việc từ Excel"
        subtitle="Tải mẫu, điền nhiều công việc trong một tệp rồi nhập hàng loạt"
        actions={
          <Button component={Link} href="/">
            Về danh sách
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <StepTitle n={1} title="Tải tệp mẫu" />
                <Typography variant="body2" color="text.secondary">
                  Mẫu có sẵn danh sách thả xuống (dự án, danh mục theo dự án, ưu tiên, người xử lý)
                  đặt cùng sheet, bên phải bảng nhập.
                </Typography>
                <ProjectSelect
                  clearable
                  projects={projects}
                  value={handlerProject}
                  onChange={setHandlerProject}
                  label="Lấy danh sách người xử lý từ dự án"
                  placeholder="Không chọn (chỉ gồm tôi)"
                />
                <Button
                  variant="contained"
                  startIcon={
                    downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />
                  }
                  onClick={downloadTemplate}
                  disabled={downloading || !projects.length}
                >
                  {downloading ? 'Đang tạo mẫu…' : 'Tải template (.xlsx)'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2} sx={{ height: '100%' }}>
                <StepTitle n={2} title="Chọn tệp đã điền" />
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInput.current?.click()}
                  onKeyDown={e =>
                    (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()
                  }
                  onDragOver={e => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  sx={{
                    flexGrow: 1,
                    minHeight: 150,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    p: 3,
                    cursor: 'pointer',
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor: dragging ? 'primary.main' : 'divider',
                    bgcolor: t =>
                      dragging ? t.alpha((t.vars || t).palette.primary.main, 0.08) : 'action.hover',
                    transition: 'all .15s'
                  }}
                >
                  <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                    {parsing ? (
                      <CircularProgress size={32} />
                    ) : (
                      <UploadFileIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    )}
                    <Typography sx={{ fontWeight: 600 }}>
                      {parsing ? 'Đang đọc tệp…' : fileName || 'Kéo thả tệp .xlsx vào đây'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      hoặc bấm để chọn tệp · tối đa {MAX_ROWS} dòng
                    </Typography>
                  </Stack>
                  <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={onPick} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {rows.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ p: 2, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
            >
              <StepTitle n={3} title="Kiểm tra & nhập" />
              <Chip label={`${rows.length} dòng`} />
              <Chip color="success" variant="outlined" label={`${valid.length} hợp lệ`} />
              {invalid > 0 && <Chip color="error" variant="outlined" label={`${invalid} lỗi`} />}
              {failedCount > 0 && <Chip color="error" label={`${failedCount} tạo thất bại`} />}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch checked={onlyErrors} onChange={e => setOnlyErrors(e.target.checked)} />
                }
                label="Chỉ hiện dòng lỗi"
              />
              <Button onClick={reset} disabled={importing}>
                Chọn tệp khác
              </Button>
              {importing ? (
                <Button color="error" variant="outlined" onClick={() => (cancelled.current = true)}>
                  Dừng
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<FileUploadIcon />}
                  disabled={!pending.length}
                  onClick={runImport}
                >
                  {doneCount
                    ? `Nhập lại ${pending.length} dòng`
                    : `Nhập ${pending.length} công việc`}
                </Button>
              )}
            </Stack>
          </Stack>

          {invalid > 0 && !importing && !doneCount && (
            <Alert severity="warning" sx={{ mx: 2, mb: 2 }}>
              {invalid} dòng có lỗi sẽ bị bỏ qua. Sửa trong Excel rồi chọn lại tệp, hoặc nhập trước{' '}
              {valid.length} dòng hợp lệ.
            </Alert>
          )}
          {allDone && !importing && (
            <Alert
              severity="success"
              sx={{ mx: 2, mb: 2 }}
              action={
                <Button color="inherit" size="small" component={Link} href="/">
                  Xem danh sách
                </Button>
              }
            >
              Đã tạo {finished} công việc.
            </Alert>
          )}

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ visibility: importing || doneCount ? 'visible' : 'hidden', borderRadius: 0 }}
          />
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 70 }}>Dòng</TableCell>
                  <TableCell sx={{ width: 150 }}>Kết quả</TableCell>
                  <TableCell>Tiêu đề</TableCell>
                  <TableCell sx={{ width: 240 }}>Dự án / Danh mục</TableCell>
                  <TableCell sx={{ width: 120 }}>Ưu tiên</TableCell>
                  <TableCell sx={{ width: 170 }}>Người xử lý</TableCell>
                  <TableCell sx={{ width: 110 }}>Hạn</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map(row => (
                  <PreviewRow key={row.raw.row} row={row} outcome={outcomes[row.raw.row]} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: 'primary.contrastText',
          bgcolor: 'primary.main'
        }}
      >
        {n}
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
    </Stack>
  )
}

function PreviewRow({ row, outcome }: { row: ImportRow; outcome?: Outcome }) {
  const failed = outcome?.state === 'failed' ? outcome.error : ''
  const problems = failed ? [failed] : row.errors
  const dueDate = row.payload?.due_date?.slice(0, 10) ?? row.raw.dueDate
  return (
    <TableRow
      hover
      sx={{
        verticalAlign: 'top',
        opacity: outcome?.state === 'done' ? 0.65 : 1,
        '&:last-child td': { borderBottom: 0 }
      }}
    >
      <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{row.raw.row}</TableCell>
      <TableCell>
        <RowStatus row={row} outcome={outcome} />
      </TableCell>
      <TableCell sx={{ maxWidth: 420 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
          {row.raw.summary || <em>(trống)</em>}
        </Typography>
        {problems.map(p => (
          <Typography key={p} variant="caption" color="error" component="div">
            • {p}
          </Typography>
        ))}
        {row.warnings.map(w => (
          <Typography key={w} variant="caption" color="warning.main" component="div">
            • {w}
          </Typography>
        ))}
      </TableCell>
      <TableCell>
        <Typography variant="body2">{row.projectPath || '—'}</Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {row.category}
        </Typography>
      </TableCell>
      <TableCell>{row.priorityLabel || 'Bình thường'}</TableCell>
      <TableCell>
        {row.handlerLabel || (
          <Typography variant="body2" color="text.disabled">
            Chưa giao
          </Typography>
        )}
      </TableCell>
      <TableCell>{dueDate ? formatKey(dueDate) : ''}</TableCell>
    </TableRow>
  )
}

// "2026-09-30" -> "30/09/2026"; anything else is shown as typed.
const formatKey = (key: string) => key.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')

function RowStatus({ row, outcome }: { row: ImportRow; outcome?: Outcome }) {
  if (outcome?.state === 'running') return <Chip size="small" label="Đang tạo…" />
  if (outcome?.state === 'done') {
    return (
      <Chip
        size="small"
        color="success"
        icon={<CheckCircleIcon />}
        label={outcome.id ? `Đã tạo #${outcome.id}` : 'Đã tạo'}
        component={outcome.id ? Link : 'div'}
        {...(outcome.id
          ? { href: `/issues/${outcome.id}`, clickable: true, target: '_blank' }
          : {})}
      />
    )
  }
  if (outcome?.state === 'failed') {
    return <Chip size="small" color="error" icon={<ErrorOutlineIcon />} label="Tạo thất bại" />
  }
  if (!row.payload) {
    return (
      <Chip
        size="small"
        color="error"
        variant="outlined"
        icon={<ErrorOutlineIcon />}
        label="Lỗi dữ liệu"
      />
    )
  }
  return (
    <Chip
      size="small"
      color={row.warnings.length ? 'warning' : 'success'}
      variant="outlined"
      label={row.warnings.length ? 'Hợp lệ (lưu ý)' : 'Sẵn sàng'}
    />
  )
}
