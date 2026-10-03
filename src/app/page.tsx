'use client'

import {
  Box,
  Button,
  ButtonGroup,
  Card,
  HStack,
  IconButton,
  Input,
  InputGroup,
  NativeSelect,
  Pagination,
  Stack,
  Table,
  Tabs,
  Text
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  LuChevronLeft,
  LuChevronRight,
  LuFileUp,
  LuInbox,
  LuPin,
  LuPlus,
  LuSearch
} from 'react-icons/lu'

import ApiErrorAlert from '@/components/ApiErrorAlert'
import LoadingBar from '@/components/LoadingBar'
import PageHeader from '@/components/PageHeader'
import RefreshButton from '@/components/RefreshButton'
import PriorityBadge from '@/components/PriorityBadge'
import ProjectSelect from '@/components/ProjectSelect'
import StatusChip from '@/components/StatusChip'
import { SelectField } from '@/components/ui/select-field'
import { Tooltip } from '@/components/ui/tooltip'
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

// Ark tabs need a non-empty value.
const ALL_TAB = 'all'

const STATUS_OPTIONS = [
  { value: '', label: 'Mọi trạng thái' },
  ...STATUSES.map(s => ({ value: String(s.id), label: s.label ?? s.name }))
]

const PAGE_SIZES = [10, 25, 50, 100]

// The header search sends ?q=…; re-mount on a new query so the filter box starts from it.
function IssueListWithQuery() {
  const q = useSearchParams().get('q') ?? ''
  return <IssueList key={q} initialSearch={q} />
}

export default function IssueListPage() {
  return (
    <Suspense>
      <IssueListWithQuery />
    </Suspense>
  )
}

function IssueList({ initialSearch }: { initialSearch: string }) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [filterId, setFilterId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState(initialSearch)
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

  // Mantis does not return a total: while the page is full assume there is one more page,
  // otherwise this is the last one (keep at least the current page when it comes back empty).
  const count =
    issues.length >= pageSize ? (page + 2) * pageSize : page * pageSize + Math.max(issues.length, 1)

  return (
    <>
      <PageHeader
        title="Danh sách công việc"
        subtitle="Theo dõi, lọc và xử lý các phiếu công việc"
        actions={
          <>
            <RefreshButton onClick={load} />
            <Button variant="surface" asChild>
              <NextLink href="/issues/import">
                <LuFileUp /> Nhập Excel
              </NextLink>
            </Button>
            <Button asChild>
              <NextLink href="/issues/new">
                <LuPlus /> Tạo mới
              </NextLink>
            </Button>
          </>
        }
      />

      <ApiErrorAlert error={error} mb="4" />

      <Tabs.Root
        value={filterId || ALL_TAB}
        onValueChange={e => {
          setFilterId(e.value === ALL_TAB ? '' : e.value)
          setPage(0)
        }}
        variant="enclosed"
        size="sm"
        mb="4"
      >
        <Tabs.List maxWidth="100%" overflowX="auto">
          {FILTERS.map(f => (
            <Tabs.Trigger key={f.value} value={f.value || ALL_TAB} flexShrink={0} px="3.5">
              {f.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      <Card.Root variant="outline" overflow="hidden">
        <Stack direction={{ base: 'column', md: 'row' }} gap="3" p="4" borderBottomWidth="1px">
          <InputGroup flexGrow={1} startElement={<LuSearch />}>
            <Input
              bg="bg.panel"
              placeholder="Tìm theo mã, tiêu đề, người xử lý…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
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
            width={{ md: '280px' }}
          />
          <SelectField
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            width={{ md: '180px' }}
          />
        </Stack>

        <LoadingBar loading={loading} />
        <Table.ScrollArea>
          <Table.Root interactive minWidth="760px">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader width="90px">Mã</Table.ColumnHeader>
                <Table.ColumnHeader>Công việc</Table.ColumnHeader>
                <Table.ColumnHeader width="150px">Trạng thái</Table.ColumnHeader>
                <Table.ColumnHeader width="200px">Người xử lý</Table.ColumnHeader>
                <Table.ColumnHeader width="130px">Ưu tiên</Table.ColumnHeader>
                <Table.ColumnHeader width="130px">Cập nhật</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {visible.map(issue => {
                const handler = issue.handler?.real_name || issue.handler?.name
                return (
                  <Table.Row
                    key={issue.id}
                    cursor="pointer"
                    bg="bg.panel"
                    css={{ '&:last-child td': { borderBottomWidth: 0 } }}
                    onClick={() => router.push(`/issues/${issue.id}`)}
                  >
                    <Table.Cell>
                      <HStack gap="1">
                        {issue.sticky && (
                          <Box color="orange.fg">
                            <LuPin size={14} />
                          </Box>
                        )}
                        <Text
                          textStyle="sm"
                          fontFamily="mono"
                          fontWeight="semibold"
                          color="brand.fg"
                        >
                          #{issue.id}
                        </Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell maxWidth="480px">
                      <Text textStyle="sm" fontWeight="semibold" truncate>
                        {issue.summary}
                      </Text>
                      <Text textStyle="xs" color="fg.muted" truncate>
                        {[issue.project?.name, issue.category?.name].filter(Boolean).join(' · ')}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusChip status={issue.status} />
                    </Table.Cell>
                    <Table.Cell>
                      {handler ? (
                        <HStack gap="2">
                          <UserAvatar name={handler} size={26} />
                          <Text textStyle="sm" truncate>
                            {handler}
                          </Text>
                        </HStack>
                      ) : (
                        <Text textStyle="sm" color="fg.subtle">
                          Chưa giao
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <PriorityBadge priority={issue.priority} />
                    </Table.Cell>
                    <Table.Cell>
                      <Tooltip content={formatDateTime(issue.updated_at)}>
                        <Text textStyle="sm" color="fg.muted" truncate>
                          {timeAgo(issue.updated_at)}
                        </Text>
                      </Tooltip>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
              {!loading && visible.length === 0 && (
                <Table.Row bg="bg.panel">
                  <Table.Cell colSpan={6} textAlign="center" py="16" borderBottomWidth="0">
                    <Stack align="center" gap="2" color="fg.subtle">
                      <LuInbox size={48} />
                      <Text color="fg.muted">Không có công việc nào</Text>
                    </Stack>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>

        <HStack justify="flex-end" gap="4" px="4" py="2" borderTopWidth="1px" textStyle="sm">
          <HStack gap="2">
            <Text color="fg.muted">Số dòng</Text>
            <NativeSelect.Root size="sm" width="80px">
              <NativeSelect.Field
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
              >
                {PAGE_SIZES.map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <Pagination.Root
            count={count}
            pageSize={pageSize}
            page={page + 1}
            onPageChange={e => setPage(e.page - 1)}
            siblingCount={1}
          >
            <ButtonGroup variant="ghost" size="sm" gap="1">
              <Pagination.PrevTrigger asChild>
                <IconButton aria-label="Trang trước">
                  <LuChevronLeft />
                </IconButton>
              </Pagination.PrevTrigger>
              <Pagination.Items
                render={item => (
                  <IconButton variant={{ base: 'ghost', _selected: 'outline' }}>
                    {item.value}
                  </IconButton>
                )}
              />
              <Pagination.NextTrigger asChild>
                <IconButton aria-label="Trang sau">
                  <LuChevronRight />
                </IconButton>
              </Pagination.NextTrigger>
            </ButtonGroup>
          </Pagination.Root>
        </HStack>
      </Card.Root>
    </>
  )
}
