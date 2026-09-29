'use client'

import AddIcon from '@mui/icons-material/Add'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import PageHeader from '@/components/PageHeader'
import PriorityBadge from '@/components/PriorityBadge'
import ProjectSelect from '@/components/ProjectSelect'
import StatusChip from '@/components/StatusChip'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime, timeAgo } from '@/lib/format'
import { getErrorMessage } from '@/services/httpService'
import RequestServices from '@/services/requestServices'
import { STATUSES, type Issue, type Project } from '@/services/types'

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'assigned', label: 'Giao cho tôi' },
  { value: 'reported', label: 'Tôi báo cáo' },
  { value: 'monitored', label: 'Tôi theo dõi' },
  { value: 'unassigned', label: 'Chưa giao' }
]

export default function IssueListPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [filterId, setFilterId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [reload, setReload] = useState(0)
  const [projectError, setProjectError] = useState('')
  const [result, setResult] = useState<{ key: string; issues: Issue[]; error: string }>()

  useEffect(() => {
    RequestServices.getProjectList()
      .then(res => setProjects(res.projects ?? []))
      .catch(err => setProjectError(getErrorMessage(err)))
  }, [])

  // The list is "loading" until a result for the current query key has arrived.
  const queryKey = JSON.stringify({ page, pageSize, projectId, filterId, reload })
  const loading = result?.key !== queryKey
  const issues = useMemo(() => result?.issues ?? [], [result])
  const error = result?.error || projectError

  useEffect(() => {
    let active = true
    RequestServices.getListRequest({
      page_size: pageSize,
      page: page + 1,
      project_id: projectId || undefined,
      filter_id: filterId || undefined
    })
      .then(res => active && setResult({ key: queryKey, issues: res.issues ?? [], error: '' }))
      .catch(err => active && setResult({ key: queryKey, issues: [], error: getErrorMessage(err) }))
    return () => {
      active = false
    }
  }, [queryKey, page, pageSize, projectId, filterId])

  const load = () => setReload(n => n + 1)

  // Status and keyword filtering happen on the current page, the API has no such params.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return issues.filter(
      i =>
        (!status || String(i.status?.id) === status) &&
        (!q || `${i.id} ${i.summary} ${i.handler?.name ?? ''}`.toLowerCase().includes(q))
    )
  }, [issues, search, status])

  // Mantis does not return a total, so allow "next" while the page is full.
  const count = issues.length < pageSize ? page * pageSize + issues.length : -1

  return (
    <>
      <PageHeader
        title="Danh sách công việc"
        subtitle="Theo dõi, lọc và xử lý các phiếu công việc"
        actions={
          <>
            <Tooltip title="Tải lại">
              <IconButton onClick={load} aria-label="Tải lại">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/issues/new">
              Tạo mới
            </Button>
          </>
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            error.startsWith('428') ? (
              <Button color="inherit" size="small" component={Link} href="/settings">
                Cấu hình API-KEY
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
        <Tabs
          value={filterId}
          onChange={(_, value) => {
            setFilterId(value)
            setPage(0)
          }}
          variant="scrollable"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {FILTERS.map(f => (
            <Tab key={f.value} value={f.value} label={f.label} sx={{ minHeight: 52 }} />
          ))}
        </Tabs>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2 }}>
          <TextField
            placeholder="Tìm theo mã, tiêu đề, người xử lý…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
          <ProjectSelect
            projects={projects}
            value={projectId}
            onChange={id => {
              setProjectId(id)
              setPage(0)
            }}
            label=""
            placeholder="Tất cả dự án"
            clearable
            sx={{ width: { md: 280 } }}
          />
          <TextField
            select
            value={status}
            onChange={e => setStatus(e.target.value)}
            sx={{ width: { md: 180 } }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">Mọi trạng thái</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <LinearProgress sx={{ visibility: loading ? 'visible' : 'hidden', borderRadius: 0 }} />
        <TableContainer>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 90 }}>Mã</TableCell>
                <TableCell>Công việc</TableCell>
                <TableCell sx={{ width: 150 }}>Trạng thái</TableCell>
                <TableCell sx={{ width: 200 }}>Người xử lý</TableCell>
                <TableCell sx={{ width: 130 }}>Ưu tiên</TableCell>
                <TableCell sx={{ width: 130 }}>Cập nhật</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map(issue => {
                const handler = issue.handler?.real_name || issue.handler?.name
                return (
                  <TableRow
                    key={issue.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => router.push(`/issues/${issue.id}`)}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        {issue.sticky && <PushPinIcon sx={{ fontSize: 14 }} color="warning" />}
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}
                        >
                          #{issue.id}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 480 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {issue.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {[issue.project?.name, issue.category?.name].filter(Boolean).join(' · ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={issue.status} />
                    </TableCell>
                    <TableCell>
                      {handler ? (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <UserAvatar name={handler} size={26} />
                          <Typography variant="body2" noWrap>
                            {handler}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          Chưa giao
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={issue.priority} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formatDateTime(issue.updated_at)}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {timeAgo(issue.updated_at)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!loading && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, borderBottom: 0 }}>
                    <InboxOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography color="text.secondary">Không có công việc nào</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={count}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={e => {
            setPageSize(Number(e.target.value))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Số dòng"
          labelDisplayedRows={({ from, to }) => `${from}–${to}`}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
    </>
  )
}
