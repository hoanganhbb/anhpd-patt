'use client'

import { Box, Card, Grid, Skeleton, SkeletonText } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import {
  LuBuilding2,
  LuCircleCheckBig,
  LuClipboardList,
  LuFlag,
  LuHourglass,
  LuLayers,
  LuTimer,
  LuTriangleAlert,
  LuUsers
} from 'react-icons/lu'

import ApiErrorAlert from '@/components/ApiErrorAlert'
import LoadingBar from '@/components/LoadingBar'
import PageHeader from '@/components/PageHeader'
import ProjectSelect from '@/components/ProjectSelect'
import RefreshButton from '@/components/RefreshButton'
import AttentionList from '@/components/reports/AttentionList'
import BarList from '@/components/reports/BarList'
import StatusBreakdown from '@/components/reports/StatusBreakdown'
import TrendChart from '@/components/reports/TrendChart'
import StackedBarList from '@/components/StackedBarList'
import StatCard from '@/components/StatCard'
import { Alert } from '@/components/ui/alert'
import {
  byCategory,
  byHandler,
  byPriority,
  byProject,
  countByGroup,
  dailyCreated,
  formatDuration,
  groupIssues,
  isOverdue,
  median,
  needsAttention,
  resolutionHours
} from '@/lib/reports'
import { getErrorMessage } from '@/services/httpService'
import RequestServices from '@/services/requestServices'
import type { Issue, Project } from '@/services/types'

// One request for everything; the charts are computed in the browser.
const PAGE_SIZE = 700
const TREND_DAYS = 30
const ATTENTION_LIMIT = 6

const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : '0%'

function LoadingState() {
  return (
    <Grid gap="5">
      <Grid
        gap="4"
        templateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height="118px" borderRadius="l3" />
        ))}
      </Grid>
      <Grid gap="5" templateColumns={{ base: '1fr', lg: '2fr 1fr' }}>
        {[8, 8].map((lines, i) => (
          <Card.Root key={i} variant="outline">
            <Card.Body>
              <SkeletonText noOfLines={lines} gap="4" />
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>
    </Grid>
  )
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [reload, setReload] = useState(0)
  // `at` is when the data arrived: the reference time for "overdue" and "age".
  const [result, setResult] = useState<{
    key: string
    issues: Issue[]
    error: string
    at: number
  }>()

  useEffect(() => {
    RequestServices.getProjectList()
      .then(res => setProjects(res.projects ?? []))
      .catch(() => setProjects([]))
  }, [])

  const queryKey = JSON.stringify({ projectId, reload })
  const loading = result?.key !== queryKey
  const issues = useMemo(() => result?.issues ?? [], [result])
  const now = result?.at ?? 0

  useEffect(() => {
    let active = true
    RequestServices.getListRequestForReport({
      page_size: PAGE_SIZE,
      page: 1,
      project_id: projectId || undefined
    })
      .then(
        res =>
          active &&
          setResult({ key: queryKey, issues: res.issues ?? [], error: '', at: Date.now() })
      )
      .catch(
        err =>
          active &&
          setResult({ key: queryKey, issues: [], error: getErrorMessage(err), at: Date.now() })
      )
    return () => {
      active = false
    }
  }, [queryKey, projectId])

  const stats = useMemo(() => {
    const totals = countByGroup(issues)
    const withDue = issues.filter(i => i.due_date).length
    const durations = issues.map(resolutionHours).filter((h): h is number => h !== undefined)
    return {
      totals,
      done: totals.resolved + totals.closed,
      overdue: issues.filter(i => isOverdue(i, now)).length,
      withDue,
      medianHours: median(durations),
      measured: durations.length,
      trend: dailyCreated(issues, TREND_DAYS, now),
      handlers: groupIssues(issues, byHandler),
      projects: groupIssues(issues, byProject),
      priorities: groupIssues(issues, byPriority),
      categories: groupIssues(issues, byCategory),
      attention: needsAttention(issues, now, ATTENTION_LIMIT)
    }
  }, [issues, now])

  const total = issues.length
  const fmt = (n: number) => n.toLocaleString('vi-VN')

  return (
    <>
      <PageHeader
        title="Thống kê công việc"
        subtitle={`Tổng hợp tối đa ${fmt(PAGE_SIZE)} phiếu mới nhất: tiến độ, khối lượng và điểm nghẽn`}
        actions={
          <>
            <ProjectSelect
              projects={projects}
              value={projectId}
              onChange={setProjectId}
              label=""
              placeholder="Tất cả dự án"
              clearable
              width={{ base: '100%', md: '280px' }}
            />
            <RefreshButton onClick={() => setReload(n => n + 1)} />
          </>
        }
      />

      <ApiErrorAlert error={result?.error} mb="4" />
      {!loading && total >= PAGE_SIZE && (
        <Alert status="warning" mb="4">
          Đã chạm giới hạn {fmt(PAGE_SIZE)} phiếu — số liệu chỉ gồm các phiếu mới nhất, chọn dự án
          để thu hẹp phạm vi.
        </Alert>
      )}
      <LoadingBar loading={loading} mb="4" />

      {!result ? (
        <LoadingState />
      ) : (
        // On refetch keep the previous numbers, dimmed, instead of flashing skeletons.
        <Grid
          gap="5"
          opacity={loading ? 0.55 : 1}
          pointerEvents={loading ? 'none' : undefined}
          transition="opacity .2s"
        >
          <Grid
            gap="4"
            templateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
          >
            <StatCard
              label="Tổng số phiếu"
              value={fmt(total)}
              hint={`${fmt(stats.handlers.length)} người xử lý · ${fmt(stats.projects.length)} dự án`}
              icon={<LuClipboardList />}
              colorPalette="brand"
            />
            <StatCard
              label="Đang mở"
              value={fmt(stats.totals.open)}
              hint={`${percent(stats.totals.open, total)} tổng số phiếu`}
              icon={<LuHourglass />}
              colorPalette="orange"
            />
            <StatCard
              label="Đã hoàn thành"
              value={fmt(stats.done)}
              hint={`Tỉ lệ hoàn thành ${percent(stats.done, total)}`}
              icon={<LuCircleCheckBig />}
              colorPalette="green"
            />
            <StatCard
              label="Quá hạn"
              value={fmt(stats.overdue)}
              hint={`Trên ${fmt(stats.withDue)} phiếu có hạn xử lý`}
              icon={<LuTriangleAlert />}
              colorPalette="red"
            />
            <StatCard
              label="Thời gian xử lý"
              value={formatDuration(stats.medianHours)}
              hint={`Trung vị từ lúc tạo · ${fmt(stats.measured)} phiếu`}
              icon={<LuTimer />}
              colorPalette="blue"
            />
          </Grid>

          <Grid gap="5" templateColumns={{ base: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
            <TrendChart rows={stats.trend} />
            <StatusBreakdown issues={issues} totals={stats.totals} />
          </Grid>

          <Grid gap="5" templateColumns={{ base: '1fr', lg: '1fr 1fr' }}>
            <Box minWidth="0">
              <StackedBarList
                icon={<LuUsers />}
                title="Theo người xử lý"
                subtitle={`${stats.handlers.length} người`}
                rows={stats.handlers}
              />
            </Box>
            <Box minWidth="0">
              <StackedBarList
                icon={<LuBuilding2 />}
                title="Theo phòng (dự án)"
                subtitle={`${stats.projects.length} dự án`}
                rows={stats.projects}
              />
            </Box>
          </Grid>

          <Grid
            gap="5"
            templateColumns={{
              base: '1fr',
              md: '1fr 1fr',
              xl: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr)'
            }}
          >
            <BarList icon={<LuFlag />} title="Theo mức ưu tiên" rows={stats.priorities} />
            <BarList
              icon={<LuLayers />}
              title="Theo danh mục"
              description={`${stats.categories.length} danh mục`}
              rows={stats.categories}
            />
            <Box gridColumn={{ md: 'span 2', xl: 'auto' }} minWidth="0">
              <AttentionList issues={stats.attention} now={now} />
            </Box>
          </Grid>
        </Grid>
      )}
    </>
  )
}
