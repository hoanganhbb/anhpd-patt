'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  CloseButton,
  Dialog,
  EmptyState,
  Grid,
  Heading,
  HStack,
  IconButton,
  Menu,
  Portal,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
  Textarea
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  LuArrowLeft,
  LuBellRing,
  LuBookOpen,
  LuCalendarDays,
  LuChartNoAxesColumnIncreasing,
  LuChevronRight,
  LuCircleCheckBig,
  LuEllipsis,
  LuEye,
  LuEyeOff,
  LuFileQuestion,
  LuFileText,
  LuFlaskConical,
  LuGlobe,
  LuInfo,
  LuLayers,
  LuLightbulb,
  LuLink,
  LuLock,
  LuPencil,
  LuPin,
  LuPinOff,
  LuRefreshCw,
  LuSave,
  LuSettings,
  LuTrash2,
  LuUndo2,
  LuWorkflow
} from 'react-icons/lu'

import IssueActivity from '@/components/issue/IssueActivity'
import IssueAttachments from '@/components/issue/IssueAttachments'
import PriorityBadge from '@/components/PriorityBadge'
import StatusChip, { statusColor } from '@/components/StatusChip'
import PersonLabel from '@/components/PersonLabel'
import { Field } from '@/components/ui/field'
import { DateRow, InfoRow } from '@/components/ui/info-row'
import { PanelHeader } from '@/components/ui/panel'
import { Pill } from '@/components/ui/pill'
import { SelectField } from '@/components/ui/select-field'
import { notify } from '@/components/ui/toaster'
import UserAvatar from '@/components/UserAvatar'
import UserSelect from '@/components/UserSelect'
import { timeAgo } from '@/lib/format'
import { getErrorMessage } from '@/services/httpService'
import { toUserOptions, type UserOption } from '@/services/normalize'
import RequestServices from '@/services/requestServices'
import {
  PRIORITIES,
  STATUSES,
  type Attachment,
  type CurrentUser,
  type Issue,
  type IssuePermission,
  type Ref
} from '@/services/types'

const StatusDot = ({ id, label }: { id: number; label: string }) => (
  <HStack as="span" gap="2">
    <Box as="span" boxSize="8px" borderRadius="full" bg={statusColor({ id, name: '' })} />
    {label}
  </HStack>
)

const STATUS_OPTIONS = STATUSES.map(s => ({
  value: String(s.id),
  label: s.label ?? s.name,
  render: <StatusDot id={s.id} label={s.label ?? s.name} />
}))
const PRIORITY_OPTIONS = PRIORITIES.map(p => ({
  value: p.name,
  label: p.label ?? p.name,
  render: <PriorityBadge priority={p} />
}))

const RESOLVED = 80

const personName = (ref?: Ref) => ref?.real_name || ref?.name || ''

const downloadBase64 = (file: { content: string; filename: string; content_type?: string }) => {
  const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: file.content_type }))
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  a.click()
  URL.revokeObjectURL(url)
}

// File -> base64 (without the "data:…;base64," prefix) for the Mantis files endpoint.
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const editOf = (issue: Issue | null) => ({
  status: String(issue?.status?.id ?? ''),
  handler: String(issue?.handler?.id ?? ''),
  priority: issue?.priority?.name ?? ''
})

const refText = (value?: Ref) => value?.label ?? value?.name

function LoadingState() {
  return (
    <Stack gap="6">
      <Skeleton height="14px" width="420px" maxWidth="100%" />
      <Stack gap="3">
        <Skeleton height="22px" width="80px" />
        <Skeleton height="34px" width="70%" />
        <Skeleton height="26px" width="45%" />
      </Stack>
      <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) 360px' }} gap="5">
        <Card.Root variant="outline">
          <Card.Body>
            <SkeletonText noOfLines={6} gap="3" />
          </Card.Body>
        </Card.Root>
        <Card.Root variant="outline">
          <Card.Body>
            <SkeletonText noOfLines={8} gap="4" />
          </Card.Body>
        </Card.Root>
      </Grid>
    </Stack>
  )
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [permission, setPermission] = useState<IssuePermission | null>(null)
  const [handlers, setHandlers] = useState<UserOption[]>([])
  const [edit, setEdit] = useState(editOf(null))
  const [description, setDescription] = useState<string | null>(null)
  const [remind, setRemind] = useState<{ open: boolean; text: string }>({ open: false, text: '' })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // Reference time for "overdue", fixed when the page opens.
  const [now] = useState(() => Date.now())

  const load = useCallback(
    () =>
      RequestServices.getDetailIssue(id)
        .then(res => {
          const data = res.issues?.[0] ?? null
          setIssue(data)
          setEdit(editOf(data))
        })
        .catch(err => setLoadError(getErrorMessage(err)))
        .finally(() => setLoading(false)),
    [id]
  )

  const loadPermission = useCallback(
    () =>
      RequestServices.getPermissionRequest(id)
        .then(data => setPermission((data ?? {}) as IssuePermission))
        .catch(() => setPermission({})),
    [id]
  )

  useEffect(() => {
    load()
    loadPermission()
    RequestServices.getLstHandlerRequest(id)
      .then(data => setHandlers(toUserOptions(data)))
      .catch(() => setHandlers([]))
    RequestServices.getCurrentUser()
      .then(user => setMe(user?.id ? user : null))
      .catch(() => setMe(null))
  }, [id, load, loadPermission])

  // Unknown (still loading or endpoint failed) counts as allowed; the API has the final say.
  const can = (key: keyof IssuePermission) => permission?.[key] !== false

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      notify('success', success)
      await load()
      return true
    } catch (err) {
      notify('error', getErrorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState />
  if (!issue)
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuFileQuestion />
          </EmptyState.Indicator>
          <Stack textAlign="center" gap="1">
            <EmptyState.Title>Không tải được công việc #{id}</EmptyState.Title>
            <EmptyState.Description>
              {loadError || 'Công việc không tồn tại.'}
            </EmptyState.Description>
          </Stack>
          <Button variant="outline" asChild>
            <NextLink href="/">
              <LuArrowLeft /> Về danh sách
            </NextLink>
          </Button>
        </EmptyState.Content>
      </EmptyState.Root>
    )

  const original = editOf(issue)
  const changed = {
    status: edit.status !== original.status,
    handler: edit.handler !== original.handler,
    priority: edit.priority !== original.priority
  }
  const dirty = changed.status || changed.handler || changed.priority

  const handlerOptions =
    issue.handler && !handlers.some(h => h.id === issue.handler?.id)
      ? [
          {
            id: issue.handler.id,
            name: issue.handler.name,
            label: personName(issue.handler)
          },
          ...handlers
        ]
      : handlers

  const statusId = issue.status?.id ?? 0
  const isResolved = statusId >= RESOLVED
  const isMonitoring = permission?.can_unmonitor === true
  const canMonitorToggle = isMonitoring || permission?.can_monitor !== false
  const canSticky = issue.sticky ? can('can_unsticky') : can('can_sticky')
  const overdue = !isResolved && !!issue.due_date && new Date(issue.due_date).getTime() < now
  const reporterName = personName(issue.reporter)
  const readOnly = !can('can_update') && !can('can_assign') && !can('can_change_status')

  // Only send the fields that changed, so a missing right on one field doesn't block the rest.
  const save = () =>
    run(
      () =>
        RequestServices.updateRequest({
          id,
          data: {
            ...(changed.status && edit.status ? { status: { id: Number(edit.status) } } : {}),
            ...(changed.handler ? { handler: { id: Number(edit.handler) || 0 } } : {}),
            ...(changed.priority && edit.priority ? { priority: { name: edit.priority } } : {})
          }
        }),
      'Đã cập nhật công việc'
    )

  const saveDescription = async () => {
    if (description === null) return
    const ok = await run(
      () => RequestServices.updateRequest({ id, data: { description } }),
      'Đã cập nhật mô tả'
    )
    if (ok) setDescription(null)
  }

  const resolve = () => run(() => RequestServices.resolveRequest(id), 'Đã giải quyết công việc')

  const addNote = (text: string) =>
    run(
      () => RequestServices.addNoteRequest({ id, data: { text, view_state: { name: 'public' } } }),
      'Đã thêm ghi chú'
    )

  const toggleMonitor = () =>
    run(
      () =>
        isMonitoring
          ? RequestServices.deleteMonitorRequest(id)
          : RequestServices.addMonitorRequest(id),
      isMonitoring ? 'Đã bỏ theo dõi' : 'Đã theo dõi'
    ).then(loadPermission)

  const toggleSticky = () =>
    run(
      () => RequestServices.toggleStickRequest({ id: Number(id), sticky: !issue.sticky }),
      issue.sticky ? 'Đã bỏ ghim' : 'Đã ghim'
    ).then(loadPermission)

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
      notify('error', getErrorMessage(err))
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      notify('success', 'Đã sao chép liên kết')
    } catch {
      notify('error', 'Không sao chép được liên kết')
    }
  }

  const download = async (file: Attachment) => {
    try {
      const res = (await RequestServices.getDetailIssueFiles({
        idRequest: id,
        idFile: file.id
      })) as { files?: { content: string; filename: string; content_type?: string }[] }
      const content = res.files?.[0]
      if (!content?.content) throw new Error('Tệp không có nội dung')
      downloadBase64(content)
    } catch (err) {
      notify('error', getErrorMessage(err))
    }
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!picked.length) return
    setUploading(true)
    try {
      const files = await Promise.all(
        picked.map(async f => ({ name: f.name, content: await toBase64(f) }))
      )
      await RequestServices.addFilesRequest({ id, files })
      notify('success', `Đã tải lên ${files.length} tệp`)
      await load()
    } catch (err) {
      notify('error', getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }
  const pickFiles = () => fileInput.current?.click()

  const closeRemind = () => setRemind({ open: false, text: '' })

  return (
    <Stack gap="5">
      <input ref={fileInput} type="file" multiple hidden onChange={upload} />

      {/* Breadcrumb */}
      <HStack gap="2" textStyle="sm" color="fg.muted" wrap="wrap">
        <NextLink href="/">
          <HStack gap="2" _hover={{ color: 'fg' }}>
            <LuArrowLeft /> Trang chủ
          </HStack>
        </NextLink>
        <LuChevronRight />
        <NextLink href="/">
          <Text _hover={{ color: 'fg' }}>Danh sách công việc</Text>
        </NextLink>
        {issue.project?.name && (
          <>
            <LuChevronRight />
            <Text>{issue.project.name}</Text>
          </>
        )}
        {issue.category?.name && (
          <>
            <LuChevronRight />
            <Text color="fg" fontWeight="medium">
              {issue.category.name}
            </Text>
          </>
        )}
      </HStack>

      {/* Title */}
      <Stack direction={{ base: 'column', md: 'row' }} gap="4" justify="space-between">
        <Box minWidth="0">
          <HStack gap="2" mb="2.5">
            <Badge variant="surface" colorPalette="gray" fontFamily="mono" fontSize="13px" px="2">
              #{issue.id}
            </Badge>
            {issue.sticky && (
              <Badge colorPalette="orange" variant="subtle">
                <LuPin /> Đã ghim
              </Badge>
            )}
          </HStack>
          <Box borderLeftWidth="4px" borderColor="brand.solid" ps="4" ms={{ md: '-5' }}>
            <Heading
              as="h1"
              fontSize={{ base: '22px', md: '26px' }}
              fontWeight="bold"
              letterSpacing="-0.015em"
              lineHeight="1.3"
            >
              {issue.summary}
            </Heading>
            <HStack gap="2" mt="3" wrap="wrap" textStyle="sm" color="fg.muted">
              <StatusChip status={issue.status} />
              {issue.priority && (
                <Pill>
                  <PriorityBadge priority={issue.priority} />
                </Pill>
              )}
              {issue.severity && <Pill>Mức độ: {refText(issue.severity)}</Pill>}
              <Box color="fg.subtle">·</Box>
              <HStack gap="2">
                <UserAvatar name={reporterName} size={26} />
                <Text>
                  <Text as="span" color="fg" fontWeight="semibold">
                    {reporterName}
                  </Text>{' '}
                  tạo {timeAgo(issue.created_at)}
                </Text>
              </HStack>
            </HStack>
          </Box>
        </Box>

        <HStack gap="2" flexShrink={0} align="flex-start">
          {!isResolved && can('can_change_status') && (
            <Button colorPalette="green" onClick={resolve} disabled={busy}>
              <LuCircleCheckBig /> Giải quyết
            </Button>
          )}
          {canMonitorToggle && (
            <Button variant="outline" color="brand.fg" onClick={toggleMonitor} disabled={busy}>
              {isMonitoring ? <LuEyeOff /> : <LuEye />}
              {isMonitoring ? 'Bỏ theo dõi' : 'Theo dõi'}
            </Button>
          )}
          <Menu.Root positioning={{ placement: 'bottom-end' }}>
            <Menu.Trigger asChild>
              <IconButton variant="outline" aria-label="Thao tác khác" disabled={busy}>
                <LuEllipsis />
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content minWidth="200px">
                  <Menu.Item value="copy" onClick={copyLink}>
                    <LuLink /> Sao chép liên kết
                  </Menu.Item>
                  {can('can_remind') && (
                    <Menu.Item value="remind" onClick={() => setRemind({ open: true, text: '' })}>
                      <LuBellRing /> Nhắc việc
                    </Menu.Item>
                  )}
                  {canSticky && (
                    <Menu.Item value="sticky" onClick={toggleSticky}>
                      {issue.sticky ? <LuPinOff /> : <LuPin />}
                      {issue.sticky ? 'Bỏ ghim' : 'Ghim lên đầu'}
                    </Menu.Item>
                  )}
                  {can('can_delete') && (
                    <>
                      <Menu.Separator />
                      <Menu.Item
                        value="delete"
                        color="fg.error"
                        _hover={{ bg: 'bg.error', color: 'fg.error' }}
                        onClick={remove}
                      >
                        <LuTrash2 /> Xoá công việc
                      </Menu.Item>
                    </>
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </HStack>
      </Stack>

      <Grid
        templateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) 360px' }}
        gap="5"
        alignItems="start"
      >
        {/* Main column */}
        <Stack gap="5" minWidth="0">
          <Card.Root variant="outline">
            <PanelHeader
              icon={<LuFileText />}
              title="Mô tả công việc"
              actions={
                <>
                  {can('can_update') && description === null && (
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="gray"
                      onClick={() => setDescription(issue.description ?? '')}
                    >
                      <LuPencil /> Chỉnh sửa
                    </Button>
                  )}
                </>
              }
            />
            <Card.Body pt="3" gap="5">
              {description !== null ? (
                <Stack gap="3">
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={6}
                    autoresize
                    autoFocus
                    bg="bg.panel"
                  />
                  <HStack justify="flex-end" gap="2">
                    <Button variant="ghost" onClick={() => setDescription(null)} disabled={busy}>
                      Huỷ
                    </Button>
                    <Button onClick={saveDescription} disabled={busy || !description.trim()}>
                      <LuSave /> Lưu mô tả
                    </Button>
                  </HStack>
                </Stack>
              ) : issue.description ? (
                <Text lineHeight="1.6" whiteSpace="pre-wrap" wordBreak="break-word">
                  {issue.description}
                </Text>
              ) : (
                <Text color="fg.subtle">Không có mô tả.</Text>
              )}
              {issue.steps_to_reproduce && (
                <Box>
                  <Text fontWeight="semibold" mb="1">
                    Các bước tái hiện
                  </Text>
                  <Text lineHeight="1.6" whiteSpace="pre-wrap" wordBreak="break-word">
                    {issue.steps_to_reproduce}
                  </Text>
                </Box>
              )}
              {issue.additional_information && (
                <Box>
                  <Text fontWeight="semibold" mb="1">
                    Thông tin thêm
                  </Text>
                  <Text lineHeight="1.6" whiteSpace="pre-wrap" wordBreak="break-word">
                    {issue.additional_information}
                  </Text>
                </Box>
              )}
            </Card.Body>
          </Card.Root>

          <IssueAttachments
            files={issue.attachments ?? []}
            uploading={uploading}
            onDownload={download}
            onAdd={can('can_update') ? pickFiles : undefined}
          />

          <IssueActivity
            notes={issue.notes ?? []}
            history={issue.history ?? []}
            me={me ? me.real_name || me.name : undefined}
            busy={busy}
            onAddNote={addNote}
            onAttach={can('can_update') ? pickFiles : undefined}
          />
        </Stack>

        {/* Side column */}
        <Stack gap="5" position={{ lg: 'sticky' }} top={{ lg: '84px' }}>
          <Card.Root variant="outline">
            <PanelHeader
              icon={<LuWorkflow />}
              title="Xử lý công việc"
              actions={
                <>
                  <Menu.Root positioning={{ placement: 'bottom-end' }}>
                    <Menu.Trigger asChild>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="gray"
                        aria-label="Tuỳ chọn"
                      >
                        <LuSettings />
                      </IconButton>
                    </Menu.Trigger>
                    <Portal>
                      <Menu.Positioner>
                        <Menu.Content>
                          <Menu.Item
                            value="reset"
                            disabled={!dirty}
                            onClick={() => setEdit(original)}
                          >
                            <LuUndo2 /> Hoàn tác thay đổi
                          </Menu.Item>
                          <Menu.Item value="reload" onClick={() => void load()}>
                            <LuRefreshCw /> Tải lại dữ liệu
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Portal>
                  </Menu.Root>
                </>
              }
            />
            <Card.Body pt="3" gap="4">
              <SelectField
                label="Trạng thái"
                options={STATUS_OPTIONS}
                value={edit.status}
                onChange={status => setEdit(s => ({ ...s, status }))}
                disabled={!can('can_change_status')}
              />
              <UserSelect
                label="Người xử lý"
                users={handlerOptions}
                value={edit.handler}
                onChange={handler => setEdit(s => ({ ...s, handler }))}
                placeholder="Chưa giao · tìm người xử lý…"
                disabled={!can('can_assign')}
              />
              <SelectField
                label="Ưu tiên"
                options={PRIORITY_OPTIONS}
                value={edit.priority}
                onChange={priority => setEdit(s => ({ ...s, priority }))}
                disabled={!can('can_update')}
              />
              {readOnly ? (
                <HStack
                  gap="2"
                  px="3"
                  py="2.5"
                  borderRadius="l2"
                  bg="bg.muted"
                  textStyle="sm"
                  color="fg.muted"
                >
                  <LuLock />
                  Bạn chỉ có quyền xem ở trạng thái hiện tại của phiếu.
                </HStack>
              ) : (
                <Button size="lg" onClick={save} disabled={busy || !dirty}>
                  <LuSave /> Lưu thay đổi
                </Button>
              )}
            </Card.Body>
          </Card.Root>

          <Card.Root variant="outline">
            <PanelHeader icon={<LuInfo />} title="Thông tin chi tiết" />
            <Card.Body pt="3" gap="3.5">
              <InfoRow label="Dự án" icon={<LuBookOpen />}>
                {issue.project?.name ?? '—'}
              </InfoRow>
              <InfoRow label="Danh mục" icon={<LuLayers />}>
                {refText(issue.category) ?? '—'}
              </InfoRow>
              <InfoRow label="Người báo cáo">
                <PersonLabel person={issue.reporter} />
              </InfoRow>
              <InfoRow label="Người xử lý">
                <PersonLabel person={issue.handler} fallback="Chưa giao" />
              </InfoRow>
              <InfoRow
                label="Mức độ"
                icon={
                  <Box color="red.fg">
                    <LuChartNoAxesColumnIncreasing />
                  </Box>
                }
              >
                {refText(issue.severity) ?? '—'}
              </InfoRow>
              <InfoRow label="Tái hiện" icon={<LuFlaskConical />}>
                {refText(issue.reproducibility) ?? '—'}
              </InfoRow>
              <InfoRow label="Hướng giải quyết" icon={<LuLightbulb />}>
                {refText(issue.resolution) ?? '—'}
              </InfoRow>
              <InfoRow label="Phạm vi" icon={<LuGlobe />}>
                {refText(issue.view_state) ?? '—'}
              </InfoRow>
              {!!issue.monitors?.length && (
                <InfoRow label="Người theo dõi" icon={<LuEye />}>
                  <HStack gap="1" wrap="wrap">
                    {issue.monitors.map(m => (
                      <UserAvatar key={m.id} name={personName(m)} size={24} />
                    ))}
                  </HStack>
                </InfoRow>
              )}
              {!!issue.tags?.length && (
                <InfoRow label="Thẻ">
                  <HStack gap="1.5" wrap="wrap">
                    {issue.tags.map(t => (
                      <Badge key={t.id} variant="subtle" colorPalette="gray">
                        {t.name}
                      </Badge>
                    ))}
                  </HStack>
                </InfoRow>
              )}
            </Card.Body>
          </Card.Root>

          <Card.Root variant="outline">
            <PanelHeader icon={<LuCalendarDays />} title="Thời gian" />
            <Card.Body pt="3" gap="3">
              <DateRow label="Hạn xử lý" value={issue.due_date} danger={overdue} />
              <DateRow label="Bắt đầu" value={issue.date_start} />
              <DateRow label="Kết thúc" value={issue.date_end} />
              <DateRow label="Ngày tạo" value={issue.created_at} />
              <DateRow label="Cập nhật" value={issue.updated_at} />
            </Card.Body>
          </Card.Root>
        </Stack>
      </Grid>

      <Dialog.Root
        open={remind.open}
        onOpenChange={e => !e.open && closeRemind()}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Nhắc việc #{issue.id}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text textStyle="sm" color="fg.muted" mb="3">
                  Gửi nhắc nhở tới {personName(issue.handler) || 'người xử lý'} về công việc này.
                </Text>
                <Field label="Nội dung nhắc">
                  <Textarea
                    autoFocus
                    value={remind.text}
                    onChange={e => setRemind(r => ({ ...r, text: e.target.value }))}
                    rows={3}
                    autoresize
                  />
                </Field>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={closeRemind}>
                  Huỷ
                </Button>
                <Button onClick={sendRemind} disabled={busy}>
                  <LuBellRing /> Gửi nhắc việc
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  )
}
