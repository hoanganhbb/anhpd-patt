'use client'

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventNoteIcon from '@mui/icons-material/EventNote'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Popover from '@mui/material/Popover'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import NextLink from 'next/link'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'

import MonthCalendar from '@/components/calendar/MonthCalendar'
import QuickCreateForm from '@/components/calendar/QuickCreateForm'
import PageHeader from '@/components/PageHeader'
import ProjectSelect from '@/components/ProjectSelect'
import StatCard from '@/components/StatCard'
import StatusChip, { statusColor } from '@/components/StatusChip'
import { projectWithChildrenIds } from '@/lib/projects'
import { matchesText } from '@/lib/text'
import { groupByDay, isResolved, toDateKey } from '@/lib/calendar'
import { getErrorMessage } from '@/services/httpService'
import RequestServices from '@/services/requestServices'
import type { CurrentUser, Issue, Project } from '@/services/types'

const PAGE_SIZE = 100
const MAX_PAGES = 10

// All issues assigned to the current user, page by page.
const fetchAssigned = async () => {
  const all: Issue[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await RequestServices.getListRequest({
      filter_id: 'reported',
      page_size: PAGE_SIZE,
      page
    })
    all.push(...(res.issues ?? []))
    if ((res.issues?.length ?? 0) < PAGE_SIZE) break
  }
  return all
}

const formatDay = (key: string) => {
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y}`
}

export default function CalendarPage() {
  const todayKey = toDateKey(new Date())
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(todayKey)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ key: number; issues: Issue[]; error: string }>()
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [setupError, setSetupError] = useState('')
  const [popover, setPopover] = useState<{ anchor: HTMLElement; issue: Issue } | null>(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [bulkResolving, setBulkResolving] = useState(false)
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    RequestServices.getCurrentUser()
      .then(user => setMe(user?.id ? user : null))
      .catch(err => setSetupError(getErrorMessage(err)))
    RequestServices.getProjectList()
      .then(res => setProjects(res.projects ?? []))
      .catch(err => setSetupError(getErrorMessage(err)))
  }, [])

  // Re-fetch whenever `reload` is bumped (after each create / resolve).
  useEffect(() => {
    let active = true
    fetchAssigned()
      .then(issues => active && setResult({ key: reload, issues, error: '' }))
      .catch(err => active && setResult({ key: reload, issues: [], error: getErrorMessage(err) }))
    return () => {
      active = false
    }
  }, [reload])

  const loading = result?.key !== reload
  const allIssues = useMemo(() => result?.issues ?? [], [result])
  // Client-side filters: project (incl. sub-projects) and accent-insensitive keyword.
  const issues = useMemo(() => {
    const ids = projectFilter ? projectWithChildrenIds(projects, projectFilter) : null
    return allIssues.filter(
      i =>
        (!ids || ids.has(String(i.project?.id))) &&
        (!keyword.trim() || matchesText(`${i.id} ${i.summary} ${i.project?.name ?? ''}`, keyword))
    )
  }, [allIssues, projects, projectFilter, keyword])
  const byDay = useMemo(() => groupByDay(issues), [issues])
  const refetch = () => setReload(n => n + 1)

  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`
  const monthIssues = [...byDay.entries()]
    .filter(([key]) => key.startsWith(monthPrefix))
    .flatMap(([, list]) => list)
  const monthOpen = monthIssues.filter(i => !isResolved(i)).length
  const overdue = issues.filter(
    i => !isResolved(i) && i.due_date && toDateKey(new Date(i.due_date)) < todayKey
  ).length
  const monthOpenIssues = monthIssues.filter(i => !isResolved(i))
  const dayIssues = byDay.get(selected) ?? []

  const shiftMonth = (delta: number) =>
    setView(v => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const selectDay = (key: string) => {
    if (!key) return
    setSelected(key)
    const [y, m] = key.split('-').map(Number)
    setView({ year: y, month: m - 1 })
  }

  const goToday = () => selectDay(todayKey)

  const resolve = async (issue: Issue) => {
    setResolvingId(issue.id)
    try {
      await RequestServices.resolveRequest(issue.id)
      setToast({ severity: 'success', text: `Đã giải quyết #${issue.id}` })
      setPopover(null)
      refetch()
    } catch (err) {
      setToast({ severity: 'error', text: getErrorMessage(err) })
    } finally {
      setResolvingId(null)
    }
  }

  // Resolve every open issue of the displayed month, one by one; failures don't stop the rest.
  const resolveMonth = async () => {
    setBulkResolving(true)
    let done = 0
    let failed = 0
    let lastError = ''
    for (const issue of monthOpenIssues) {
      try {
        await RequestServices.resolveRequest(issue.id)
        done++
      } catch (err) {
        failed++
        lastError = getErrorMessage(err)
      }
    }
    setBulkResolving(false)
    setConfirmAll(false)
    setPopover(null)
    setToast(
      failed
        ? { severity: 'error', text: `Đã giải quyết ${done}, thất bại ${failed}: ${lastError}` }
        : { severity: 'success', text: `Đã giải quyết ${done} việc trong tháng ${view.month + 1}` }
    )
    refetch()
  }

  const openIssue = (event: MouseEvent<HTMLElement>, issue: Issue) =>
    setPopover({ anchor: event.currentTarget, issue })

  const renderResolve = (issue: Issue) =>
    isResolved(issue) ? (
      <Chip size="small" color="success" variant="outlined" label="Đã giải quyết" />
    ) : (
      <Button
        size="small"
        variant="outlined"
        color="success"
        startIcon={
          resolvingId === issue.id ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <TaskAltIcon />
          )
        }
        onClick={() => resolve(issue)}
        disabled={resolvingId !== null || bulkResolving}
      >
        Giải quyết
      </Button>
    )

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Lịch của tôi"
        subtitle="Các việc được giao cho bạn, sắp xếp theo hạn xử lý"
        actions={
          <Tooltip title="Tải lại">
            <IconButton onClick={refetch} aria-label="Tải lại">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      />

      {(setupError || result?.error) && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" component={NextLink} href="/settings">
              API-KEY
            </Button>
          }
        >
          {result?.error || setupError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {[
          {
            label: 'Việc trong tháng',
            value: monthIssues.length,
            icon: <EventNoteIcon />,
            color: 'primary' as const
          },
          {
            label: 'Chưa xong',
            value: monthOpen,
            icon: <PendingActionsIcon />,
            color: 'info' as const
          },
          {
            label: 'Đã giải quyết',
            value: monthIssues.length - monthOpen,
            icon: <TaskAltIcon />,
            color: 'success' as const
          },
          { label: 'Quá hạn', value: overdue, icon: <WarningAmberIcon />, color: 'error' as const }
        ].map(stat => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8.5 }}>
          <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderRadius: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Tháng {view.month + 1}, {view.year}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<DoneAllIcon />}
                disabled={monthOpenIssues.length === 0 || loading}
                onClick={() => setConfirmAll(true)}
              >
                Giải quyết cả tháng ({monthOpenIssues.length})
              </Button>
              <Button size="small" variant="outlined" onClick={goToday}>
                Hôm nay
              </Button>
              <IconButton size="small" onClick={() => shiftMonth(-1)} aria-label="Tháng trước">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton size="small" onClick={() => shiftMonth(1)} aria-label="Tháng sau">
                <ChevronRightIcon />
              </IconButton>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
              <ProjectSelect
                projects={projects}
                value={projectFilter}
                onChange={setProjectFilter}
                label=""
                placeholder="Tất cả dự án"
                clearable
                sx={{ width: { sm: 280 } }}
              />
              <TextField
                placeholder="Lọc theo mã, tiêu đề…"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
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
            </Stack>
            <LinearProgress sx={{ mb: 1, visibility: loading ? 'visible' : 'hidden' }} />
            <MonthCalendar
              year={view.year}
              month={view.month}
              issuesByDay={byDay}
              selected={selected}
              onSelectDay={selectDay}
              onIssueClick={openIssue}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Việc hiển thị theo hạn xử lý; việc không có hạn hiển thị theo ngày tạo.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 3.5 }}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <QuickCreateForm
                projects={projects}
                me={me}
                date={selected}
                onDateChange={selectDay}
                onCreated={id => {
                  setToast({ severity: 'success', text: id ? `Đã tạo #${id}` : 'Đã tạo việc' })
                  refetch()
                }}
              />
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Stack
                direction="row"
                sx={{ px: 2.5, py: 1.75, alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="subtitle1">Việc ngày {formatDay(selected)}</Typography>
                <Chip size="small" label={dayIssues.length} color="primary" variant="outlined" />
              </Stack>
              <Divider />
              {dayIssues.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                  Không có việc nào.
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />}>
                  {dayIssues.map(issue => (
                    <Stack
                      key={issue.id}
                      direction="row"
                      spacing={1.5}
                      sx={{ px: 2.5, py: 1.5, alignItems: 'center' }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          alignSelf: 'stretch',
                          borderRadius: 2,
                          bgcolor: statusColor(issue.status)
                        }}
                      />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Link
                          component={NextLink}
                          href={`/issues/${issue.id}`}
                          underline="hover"
                          color="text.primary"
                          variant="body2"
                          noWrap
                          sx={{
                            display: 'block',
                            fontWeight: 600,
                            textDecoration: isResolved(issue) ? 'line-through' : undefined
                          }}
                        >
                          {issue.summary}
                        </Link>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          #{issue.id} · {issue.status?.label ?? issue.status?.name}
                        </Typography>
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>{renderResolve(issue)}</Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Popover
        open={!!popover}
        anchorEl={popover?.anchor}
        onClose={() => setPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {popover && (
          <Stack spacing={1.5} sx={{ p: 2, maxWidth: 360 }}>
            <Typography variant="subtitle2">
              #{popover.issue.id} {popover.issue.summary}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status={popover.issue.status} />
              <Typography variant="caption" color="text.secondary">
                {popover.issue.project?.name} ·{' '}
                {popover.issue.priority?.label ?? popover.issue.priority?.name}
              </Typography>
            </Stack>
            {popover.issue.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  whiteSpace: 'pre-wrap',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {popover.issue.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {renderResolve(popover.issue)}
              <Link
                component={NextLink}
                href={`/issues/${popover.issue.id}`}
                variant="body2"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                Chi tiết <OpenInNewIcon fontSize="inherit" />
              </Link>
            </Stack>
          </Stack>
        )}
      </Popover>

      <Dialog open={confirmAll} onClose={() => !bulkResolving && setConfirmAll(false)}>
        <DialogTitle>Giải quyết tất cả việc trong tháng?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {monthOpenIssues.length} việc chưa xong của tháng {view.month + 1}/{view.year} sẽ được
            chuyển sang trạng thái đã giải quyết
            {(projectFilter || keyword.trim()) && ' (chỉ tính các việc đang được lọc)'}.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAll(false)} disabled={bulkResolving}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={resolveMonth}
            disabled={bulkResolving}
            startIcon={bulkResolving ? <CircularProgress size={14} color="inherit" /> : <DoneAllIcon />}
          >
            Giải quyết tất cả
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          onClose={() => setToast(null)}
          variant="filled"
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
