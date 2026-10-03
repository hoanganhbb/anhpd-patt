'use client'

import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Link,
  Popover,
  Portal,
  Separator,
  Spinner,
  Stack,
  StackSeparator,
  Text
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  LuCalendarClock,
  LuCalendarDays,
  LuCheckCheck,
  LuChevronLeft,
  LuChevronRight,
  LuListChecks,
  LuZap,
  LuCircleCheckBig,
  LuExternalLink,
  LuSearch,
  LuTriangleAlert
} from 'react-icons/lu'

import MonthCalendar from '@/components/calendar/MonthCalendar'
import QuickCreateForm from '@/components/calendar/QuickCreateForm'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import LoadingBar from '@/components/LoadingBar'
import PageHeader from '@/components/PageHeader'
import RefreshButton from '@/components/RefreshButton'
import ProjectSelect from '@/components/ProjectSelect'
import StatCard from '@/components/StatCard'
import StatusChip, { statusColor } from '@/components/StatusChip'
import { Panel } from '@/components/ui/panel'
import { notify } from '@/components/ui/toaster'
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
      notify('success', `Đã giải quyết #${issue.id}`)
      setPopover(null)
      refetch()
    } catch (err) {
      notify('error', getErrorMessage(err))
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
    if (failed) notify('error', `Đã giải quyết ${done}, thất bại ${failed}: ${lastError}`)
    else notify('success', `Đã giải quyết ${done} việc trong tháng ${view.month + 1}`)
    refetch()
  }

  const openIssue = (event: MouseEvent<HTMLElement>, issue: Issue) =>
    setPopover({ anchor: event.currentTarget, issue })

  const renderResolve = (issue: Issue) =>
    isResolved(issue) ? (
      <Badge colorPalette="green" variant="outline">
        Đã giải quyết
      </Badge>
    ) : (
      <Button
        size="xs"
        variant="outline"
        colorPalette="green"
        onClick={() => resolve(issue)}
        disabled={resolvingId !== null || bulkResolving}
      >
        {resolvingId === issue.id ? <Spinner size="xs" /> : <LuCircleCheckBig />}
        Giải quyết
      </Button>
    )

  return (
    <Stack gap="5">
      <PageHeader
        title="Lịch của tôi"
        subtitle="Các việc được giao cho bạn, sắp xếp theo hạn xử lý"
        actions={<RefreshButton onClick={refetch} />}
      />

      <ApiErrorAlert error={result?.error || setupError} />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="4">
        {(
          [
            {
              label: 'Việc trong tháng',
              value: monthIssues.length,
              icon: <LuCalendarDays />,
              colorPalette: 'brand'
            },
            {
              label: 'Chưa xong',
              value: monthOpen,
              icon: <LuCalendarClock />,
              colorPalette: 'blue'
            },
            {
              label: 'Đã giải quyết',
              value: monthIssues.length - monthOpen,
              icon: <LuCircleCheckBig />,
              colorPalette: 'green'
            },
            { label: 'Quá hạn', value: overdue, icon: <LuTriangleAlert />, colorPalette: 'red' }
          ] as const
        ).map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </Grid>

      <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 8.5fr) minmax(0, 3.5fr)' }} gap="4">
        <GridItem minWidth="0">
          <Panel
            icon={<LuCalendarDays />}
            title={`Tháng ${view.month + 1}, ${view.year}`}
            bodyProps={{ px: { base: '2', sm: '6' } }}
            actions={
              <>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="green"
                  disabled={monthOpenIssues.length === 0 || loading}
                  onClick={() => setConfirmAll(true)}
                >
                  <LuCheckCheck /> Giải quyết cả tháng ({monthOpenIssues.length})
                </Button>
                <Button size="sm" variant="outline" onClick={goToday}>
                  Hôm nay
                </Button>
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorPalette="gray"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Tháng trước"
                >
                  <LuChevronLeft />
                </IconButton>
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorPalette="gray"
                  onClick={() => shiftMonth(1)}
                  aria-label="Tháng sau"
                >
                  <LuChevronRight />
                </IconButton>
              </>
            }
          >
            <Stack direction={{ base: 'column', sm: 'row' }} gap="3" mb="3">
              <ProjectSelect
                projects={projects}
                value={projectFilter}
                onChange={setProjectFilter}
                label=""
                placeholder="Tất cả dự án"
                clearable
                width={{ sm: '280px' }}
              />
              <InputGroup flexGrow={1} startElement={<LuSearch />}>
                <Input
                  bg="bg.panel"
                  placeholder="Lọc theo mã, tiêu đề…"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
              </InputGroup>
            </Stack>
            <LoadingBar loading={loading} mb="2" />
            <MonthCalendar
              year={view.year}
              month={view.month}
              issuesByDay={byDay}
              selected={selected}
              onSelectDay={selectDay}
              onIssueClick={openIssue}
            />
            <Text textStyle="xs" color="fg.muted" mt="2">
              Việc hiển thị theo hạn xử lý; việc không có hạn hiển thị theo ngày tạo.
            </Text>
          </Panel>
        </GridItem>

        <GridItem minWidth="0">
          <Stack gap="4">
            <Panel
              icon={<LuZap />}
              title="Tạo việc nhanh"
              description={`Giao cho ${me ? me.real_name || me.name : '…'}`}
            >
              <QuickCreateForm
                projects={projects}
                me={me}
                date={selected}
                onDateChange={selectDay}
                onCreated={id => {
                  notify('success', id ? `Đã tạo #${id}` : 'Đã tạo việc')
                  refetch()
                }}
              />
            </Panel>

            <Panel
              icon={<LuListChecks />}
              title={`Việc ngày ${formatDay(selected)}`}
              actions={<Badge variant="outline">{dayIssues.length}</Badge>}
              overflow="hidden"
              bodyProps={{ p: '0' }}
            >
              <Separator />
              {dayIssues.length === 0 ? (
                <Text textStyle="sm" color="fg.muted" px="4" py="3">
                  Không có việc nào.
                </Text>
              ) : (
                <Stack gap="0" separator={<StackSeparator />}>
                  {dayIssues.map(issue => (
                    <HStack key={issue.id} gap="3" px="5" py="3">
                      <Box
                        width="4px"
                        alignSelf="stretch"
                        borderRadius="full"
                        bg={statusColor(issue.status)}
                      />
                      <Box minWidth="0" flexGrow={1}>
                        <Link
                          asChild
                          display="block"
                          textStyle="sm"
                          fontWeight="semibold"
                          color="fg"
                          truncate
                          textDecoration={isResolved(issue) ? 'line-through' : undefined}
                        >
                          <NextLink href={`/issues/${issue.id}`}>{issue.summary}</NextLink>
                        </Link>
                        <Text textStyle="xs" color="fg.muted" truncate>
                          #{issue.id} · {issue.status?.label ?? issue.status?.name}
                        </Text>
                      </Box>
                      <Box flexShrink={0}>{renderResolve(issue)}</Box>
                    </HStack>
                  ))}
                </Stack>
              )}
            </Panel>
          </Stack>
        </GridItem>
      </Grid>

      <Popover.Root
        open={!!popover}
        onOpenChange={e => !e.open && setPopover(null)}
        positioning={{
          placement: 'bottom-start',
          getAnchorRect: () => popover?.anchor.getBoundingClientRect() ?? null
        }}
      >
        <Portal>
          <Popover.Positioner>
            <Popover.Content maxWidth="360px">
              {popover && (
                <Popover.Body p="4">
                  <Stack gap="3">
                    <Text textStyle="sm" fontWeight="semibold">
                      #{popover.issue.id} {popover.issue.summary}
                    </Text>
                    <HStack gap="2" wrap="wrap">
                      <StatusChip status={popover.issue.status} />
                      <Text textStyle="xs" color="fg.muted">
                        {popover.issue.project?.name} ·{' '}
                        {popover.issue.priority?.label ?? popover.issue.priority?.name}
                      </Text>
                    </HStack>
                    {popover.issue.description && (
                      <Text textStyle="sm" color="fg.muted" whiteSpace="pre-wrap" lineClamp={4}>
                        {popover.issue.description}
                      </Text>
                    )}
                    <HStack gap="2">
                      {renderResolve(popover.issue)}
                      <Link asChild textStyle="sm" color="brand.fg">
                        <NextLink href={`/issues/${popover.issue.id}`}>
                          Chi tiết <LuExternalLink />
                        </NextLink>
                      </Link>
                    </HStack>
                  </Stack>
                </Popover.Body>
              )}
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>

      <Dialog.Root
        open={confirmAll}
        onOpenChange={e => !e.open && !bulkResolving && setConfirmAll(false)}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Giải quyết tất cả việc trong tháng?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text color="fg.muted">
                  {monthOpenIssues.length} việc chưa xong của tháng {view.month + 1}/{view.year} sẽ
                  được chuyển sang trạng thái đã giải quyết
                  {(projectFilter || keyword.trim()) && ' (chỉ tính các việc đang được lọc)'}.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmAll(false)}
                  disabled={bulkResolving}
                >
                  Hủy
                </Button>
                <Button colorPalette="green" onClick={resolveMonth} loading={bulkResolving}>
                  <LuCheckCheck /> Giải quyết tất cả
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild disabled={bulkResolving}>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  )
}
