'use client'

import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Progress,
  Spinner,
  Stack,
  Switch,
  Table,
  Text
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { LuCircleAlert, LuCircleCheck, LuDownload, LuFileUp, LuUpload } from 'react-icons/lu'

import PageHeader from '@/components/PageHeader'
import ProjectSelect from '@/components/ProjectSelect'
import { Alert } from '@/components/ui/alert'
import { Panel } from '@/components/ui/panel'
import { StepNumber } from '@/components/ui/step-number'
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
          <Button variant="ghost" asChild>
            <NextLink href="/">Về danh sách</NextLink>
          </Button>
        }
      />

      {error && (
        <Alert status="error" mb="4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid templateColumns={{ base: '1fr', md: '5fr 7fr' }} gap="5" mb="5">
        <GridItem minWidth="0">
          <Panel icon={<StepNumber n={1} />} title="Tải tệp mẫu" height="100%">
            <Stack gap="4">
              <Text textStyle="sm" color="fg.muted">
                Mẫu có sẵn danh sách thả xuống (dự án, danh mục theo dự án, ưu tiên, người xử lý)
                đặt cùng sheet, bên phải bảng nhập.
              </Text>
              <ProjectSelect
                clearable
                projects={projects}
                value={handlerProject}
                onChange={setHandlerProject}
                label="Lấy danh sách người xử lý từ dự án"
                placeholder="Không chọn (chỉ gồm tôi)"
              />
              <Button
                onClick={downloadTemplate}
                loading={downloading}
                loadingText="Đang tạo mẫu…"
                disabled={!projects.length}
              >
                <LuDownload /> Tải template (.xlsx)
              </Button>
            </Stack>
          </Panel>
        </GridItem>
        <GridItem minWidth="0">
          <Panel icon={<StepNumber n={2} />} title="Chọn tệp đã điền" height="100%">
            <Stack gap="4" height="100%">
              <Flex
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
                onDragOver={e => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                flexGrow={1}
                minHeight="150px"
                align="center"
                justify="center"
                textAlign="center"
                p="6"
                cursor="pointer"
                borderRadius="lg"
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={dragging ? 'brand.solid' : 'border'}
                bg={dragging ? 'brand.subtle' : 'bg.muted'}
                transition="all .15s"
                focusRingStyle="outside"
              >
                <Stack gap="1" align="center">
                  {parsing ? (
                    <Spinner size="lg" color="brand.solid" />
                  ) : (
                    <Box color="brand.fg">
                      <LuFileUp size={40} />
                    </Box>
                  )}
                  <Text fontWeight="semibold">
                    {parsing ? 'Đang đọc tệp…' : fileName || 'Kéo thả tệp .xlsx vào đây'}
                  </Text>
                  <Text textStyle="xs" color="fg.muted">
                    hoặc bấm để chọn tệp · tối đa {MAX_ROWS} dòng
                  </Text>
                </Stack>
                <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={onPick} />
              </Flex>
            </Stack>
          </Panel>
        </GridItem>
      </Grid>

      {rows.length > 0 && (
        <Panel
          icon={<StepNumber n={3} />}
          title="Kiểm tra & nhập"
          overflow="hidden"
          bodyProps={{ p: '0' }}
          actions={
            <>
              <Switch.Root
                checked={onlyErrors}
                onCheckedChange={e => setOnlyErrors(e.checked)}
                me="2"
              >
                <Switch.HiddenInput />
                <Switch.Control />
                <Switch.Label>Chỉ hiện dòng lỗi</Switch.Label>
              </Switch.Root>
              <Button variant="ghost" onClick={reset} disabled={importing}>
                Chọn tệp khác
              </Button>
              {importing ? (
                <Button
                  variant="outline"
                  colorPalette="red"
                  onClick={() => (cancelled.current = true)}
                >
                  Dừng
                </Button>
              ) : (
                <Button disabled={!pending.length} onClick={runImport}>
                  <LuUpload />
                  {doneCount
                    ? `Nhập lại ${pending.length} dòng`
                    : `Nhập ${pending.length} công việc`}
                </Button>
              )}
            </>
          }
        >
          <HStack gap="2" wrap="wrap" px="6" pb="4">
            <Badge size="lg" variant="subtle" colorPalette="gray">
              {rows.length} dòng
            </Badge>
            <Badge size="lg" variant="outline" colorPalette="green">
              {valid.length} hợp lệ
            </Badge>
            {invalid > 0 && (
              <Badge size="lg" variant="outline" colorPalette="red">
                {invalid} lỗi
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge size="lg" variant="solid" colorPalette="red">
                {failedCount} tạo thất bại
              </Badge>
            )}
          </HStack>

          {invalid > 0 && !importing && !doneCount && (
            <Alert status="warning" mx="6" mb="4" width="auto">
              {invalid} dòng có lỗi sẽ bị bỏ qua. Sửa trong Excel rồi chọn lại tệp, hoặc nhập trước{' '}
              {valid.length} dòng hợp lệ.
            </Alert>
          )}
          {allDone && !importing && (
            <Alert
              status="success"
              mx="6"
              mb="4"
              width="auto"
              action={
                <Button size="xs" variant="outline" colorPalette="green" asChild>
                  <NextLink href="/">Xem danh sách</NextLink>
                </Button>
              }
            >
              Đã tạo {finished} công việc.
            </Alert>
          )}

          <Progress.Root
            value={progress}
            size="xs"
            visibility={importing || doneCount ? 'visible' : 'hidden'}
          >
            <Progress.Track borderRadius="0">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Table.ScrollArea maxHeight="640px">
            <Table.Root stickyHeader size="sm" interactive minWidth="1000px">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="70px">Dòng</Table.ColumnHeader>
                  <Table.ColumnHeader width="150px">Kết quả</Table.ColumnHeader>
                  <Table.ColumnHeader>Tiêu đề</Table.ColumnHeader>
                  <Table.ColumnHeader width="240px">Dự án / Danh mục</Table.ColumnHeader>
                  <Table.ColumnHeader width="120px">Ưu tiên</Table.ColumnHeader>
                  <Table.ColumnHeader width="170px">Người xử lý</Table.ColumnHeader>
                  <Table.ColumnHeader width="110px">Hạn</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visible.map(row => (
                  <PreviewRow key={row.raw.row} row={row} outcome={outcomes[row.raw.row]} />
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Panel>
      )}
    </>
  )
}

function PreviewRow({ row, outcome }: { row: ImportRow; outcome?: Outcome }) {
  const failed = outcome?.state === 'failed' ? outcome.error : ''
  const problems = failed ? [failed] : row.errors
  const dueDate = row.payload?.due_date?.slice(0, 10) ?? row.raw.dueDate
  return (
    <Table.Row
      bg="bg.panel"
      verticalAlign="top"
      opacity={outcome?.state === 'done' ? 0.65 : 1}
      css={{ '&:last-child td': { borderBottomWidth: 0 } }}
    >
      <Table.Cell fontFamily="mono" color="fg.muted">
        {row.raw.row}
      </Table.Cell>
      <Table.Cell>
        <RowStatus row={row} outcome={outcome} />
      </Table.Cell>
      <Table.Cell maxWidth="420px">
        <Text textStyle="sm" fontWeight="semibold" wordBreak="break-word">
          {row.raw.summary || <em>(trống)</em>}
        </Text>
        {problems.map(p => (
          <Text key={p} textStyle="xs" color="red.fg">
            • {p}
          </Text>
        ))}
        {row.warnings.map(w => (
          <Text key={w} textStyle="xs" color="orange.fg">
            • {w}
          </Text>
        ))}
      </Table.Cell>
      <Table.Cell>
        <Text textStyle="sm">{row.projectPath || '—'}</Text>
        <Text textStyle="xs" color="fg.muted">
          {row.category}
        </Text>
      </Table.Cell>
      <Table.Cell>{row.priorityLabel || 'Bình thường'}</Table.Cell>
      <Table.Cell>
        {row.handlerLabel || (
          <Text textStyle="sm" color="fg.subtle">
            Chưa giao
          </Text>
        )}
      </Table.Cell>
      <Table.Cell>{dueDate ? formatKey(dueDate) : ''}</Table.Cell>
    </Table.Row>
  )
}

// "2026-09-30" -> "30/09/2026"; anything else is shown as typed.
const formatKey = (key: string) => key.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')

function RowStatus({ row, outcome }: { row: ImportRow; outcome?: Outcome }) {
  if (outcome?.state === 'running') {
    return (
      <Badge colorPalette="gray">
        <Spinner size="xs" /> Đang tạo…
      </Badge>
    )
  }
  if (outcome?.state === 'done') {
    if (!outcome.id) {
      return (
        <Badge colorPalette="green" variant="solid">
          <LuCircleCheck /> Đã tạo
        </Badge>
      )
    }
    return (
      <Badge colorPalette="green" variant="solid" asChild>
        <NextLink href={`/issues/${outcome.id}`} target="_blank">
          <LuCircleCheck /> Đã tạo #{outcome.id}
        </NextLink>
      </Badge>
    )
  }
  if (outcome?.state === 'failed') {
    return (
      <Badge colorPalette="red" variant="solid">
        <LuCircleAlert /> Tạo thất bại
      </Badge>
    )
  }
  if (!row.payload) {
    return (
      <Badge colorPalette="red" variant="outline">
        <LuCircleAlert /> Lỗi dữ liệu
      </Badge>
    )
  }
  return (
    <Badge colorPalette={row.warnings.length ? 'orange' : 'green'} variant="outline">
      {row.warnings.length ? 'Hợp lệ (lưu ý)' : 'Sẵn sàng'}
    </Badge>
  )
}
