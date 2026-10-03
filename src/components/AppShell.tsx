'use client'

import {
  Box,
  Button,
  ClientOnly,
  CloseButton,
  Drawer,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Kbd,
  Menu,
  Popover,
  Portal,
  Stack,
  Text
} from '@chakra-ui/react'
import { useTheme } from 'next-themes'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  LuBell,
  LuCalendarDays,
  LuChartBar,
  LuChevronDown,
  LuCircleHelp,
  LuFileUp,
  LuKeyRound,
  LuLayoutGrid,
  LuLogOut,
  LuMenu,
  LuMonitor,
  LuMoon,
  LuPlus,
  LuSearch,
  LuSprout,
  LuSun,
  LuWebhook
} from 'react-icons/lu'

import RequestServices from '@/services/requestServices'
import type { CurrentUser } from '@/services/types'

import SidebarArt from './SidebarArt'
import { Tooltip } from './ui/tooltip'
import UserAvatar from './UserAvatar'

const SIDEBAR_WIDTH = '260px'
const HEADER_HEIGHT = '64px'

const NAV_GROUPS = [
  {
    title: 'Công việc',
    items: [
      { href: '/', label: 'Danh sách công việc', icon: <LuLayoutGrid /> },
      { href: '/calendar', label: 'Lịch của tôi', icon: <LuCalendarDays /> },
      { href: '/reports', label: 'Thống kê', icon: <LuChartBar /> },
      { href: '/issues/import', label: 'Nhập từ Excel', icon: <LuFileUp /> }
    ]
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/api-test', label: 'Kiểm thử API', icon: <LuWebhook /> },
      { href: '/settings', label: 'Quản trị API-KEY', icon: <LuKeyRound /> }
    ]
  }
]

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' || /^\/issues\/\d+/.test(pathname) : pathname.startsWith(href)

const MODES = [
  { value: 'light', label: 'Sáng', icon: <LuSun /> },
  { value: 'dark', label: 'Tối', icon: <LuMoon /> },
  { value: 'system', label: 'Theo hệ thống', icon: <LuMonitor /> }
]

const displayName = (me: CurrentUser | null) => (me ? me.real_name || me.name : 'Chưa kết nối')
const roleOf = (me: CurrentUser | null) => {
  const role = me?.access_level?.label ?? me?.access_level?.name
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Cấu hình API-KEY'
}

function Sidebar({
  pathname,
  me,
  onNavigate
}: {
  pathname: string
  me: CurrentUser | null
  onNavigate: () => void
}) {
  return (
    <Flex direction="column" height="100%" bg="bg.sidebar">
      <HStack gap="3" px="5" height={HEADER_HEIGHT} flexShrink={0}>
        <Flex
          boxSize="36px"
          borderRadius="l2"
          align="center"
          justify="center"
          color="white"
          bg="brand.solid"
          boxShadow="0 4px 12px -4px {colors.brand.600}"
        >
          <LuSprout size={20} />
        </Flex>
        <Box minWidth="0">
          <Text fontWeight="bold" lineHeight="1.2" truncate>
            Phiếu công việc
          </Text>
          <Text textStyle="xs" color="fg.muted">
            MantisBT workspace
          </Text>
        </Box>
      </HStack>

      <Box px="4" pt="2" pb="3">
        <Button asChild width="100%" justifyContent="flex-start" size="lg" px="4">
          <NextLink href="/issues/new" onClick={onNavigate}>
            <LuPlus /> Tạo công việc
          </NextLink>
        </Button>
      </Box>

      <Box flexGrow={1} overflowY="auto" px="4" py="2">
        {NAV_GROUPS.map(group => (
          <Box key={group.title} mb="5">
            <Text px="3" mb="2" textStyle="sm" color="fg.muted">
              {group.title}
            </Text>
            <Stack gap="1">
              {group.items.map(item => {
                const active = isActive(pathname, item.href)
                return (
                  <HStack
                    key={item.href}
                    asChild
                    gap="3"
                    px="3"
                    py="2.5"
                    borderRadius="l2"
                    fontSize="15px"
                    fontWeight={active ? 'semibold' : 'normal'}
                    color={active ? 'fg' : 'fg.muted'}
                    bg={active ? 'brand.subtle' : undefined}
                    transition="background-color .12s, color .12s"
                    _hover={active ? undefined : { bg: 'bg.muted', color: 'fg' }}
                    focusRingStyle="outside"
                  >
                    <NextLink href={item.href} onClick={onNavigate}>
                      <Icon boxSize="18px" color={active ? 'brand.fg' : undefined}>
                        {item.icon}
                      </Icon>
                      {item.label}
                    </NextLink>
                  </HStack>
                )
              })}
            </Stack>
          </Box>
        ))}
      </Box>

      <SidebarArt />
      <HStack gap="3" px="5" py="4" borderTopWidth="1px">
        <UserAvatar name={me?.real_name || me?.name} size={36} />
        <Box minWidth="0" flex="1">
          <Text textStyle="sm" fontWeight="semibold" truncate>
            {displayName(me)}
          </Text>
          <Text textStyle="xs" color="fg.muted" truncate>
            {me?.email ?? (me ? `@${me.name}` : 'Cấu hình API-KEY')}
          </Text>
        </Box>
        <Tooltip content="Đổi / gỡ API-KEY">
          <IconButton
            asChild
            variant="ghost"
            colorPalette="gray"
            size="sm"
            aria-label="Đổi API-KEY"
          >
            <NextLink href="/settings" onClick={onNavigate}>
              <LuLogOut />
            </NextLink>
          </IconButton>
        </Tooltip>
      </HStack>
    </Flex>
  )
}

// Enter: "#123" / "123" opens that issue, anything else filters the issue list.
function SearchBox() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  // "/" focuses the search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '/' || target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))
        return
      e.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    const q = value.trim()
    if (!q) return
    const id = q.match(/^#?(\d+)$/)?.[1]
    router.push(id ? `/issues/${id}` : `/?q=${encodeURIComponent(q)}`)
    setValue('')
    input.current?.blur()
  }

  return (
    <InputGroup
      maxWidth="420px"
      flex="1"
      startElement={<LuSearch />}
      endElement={
        <Kbd size="sm" display={{ base: 'none', md: 'inline-flex' }}>
          /
        </Kbd>
      }
    >
      <Input
        ref={input}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Tìm kiếm công việc, phiếu, người xử lý…"
        bg="bg.muted"
        borderColor="transparent"
        _focus={{ bg: 'bg.panel' }}
      />
    </InputGroup>
  )
}

function HeaderPopover({
  label,
  icon,
  title,
  hideOnMobile,
  children
}: {
  label: string
  icon: ReactNode
  title: string
  hideOnMobile?: boolean
  children: ReactNode
}) {
  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger asChild>
        <IconButton
          variant="ghost"
          colorPalette="gray"
          aria-label={label}
          display={hideOnMobile ? { base: 'none', md: 'inline-flex' } : undefined}
        >
          {icon}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="300px">
            <Popover.Header fontWeight="semibold">{title}</Popover.Header>
            <Popover.Body pt="0" textStyle="sm">
              {children}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

function UserMenu({ me }: { me: CurrentUser | null }) {
  const { theme, setTheme } = useTheme()
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          colorPalette="gray"
          height="auto"
          py="1.5"
          px={{ base: '1', md: '2' }}
          gap="3"
        >
          <UserAvatar name={me?.real_name || me?.name} size={36} />
          <Box textAlign="left" display={{ base: 'none', md: 'block' }}>
            <Text textStyle="sm" fontWeight="semibold" lineHeight="1.3">
              {displayName(me)}
            </Text>
            <Text textStyle="xs" color="fg.muted" fontWeight="normal">
              {roleOf(me)}
            </Text>
          </Box>
          <Box display={{ base: 'none', md: 'block' }}>
            <LuChevronDown />
          </Box>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minWidth="240px">
            <Box px="2" py="1.5">
              <Text textStyle="sm" fontWeight="semibold">
                {displayName(me)}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                {me?.email ?? roleOf(me)}
              </Text>
            </Box>
            <Menu.Separator />
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Giao diện</Menu.ItemGroupLabel>
              <Menu.RadioItemGroup value={theme ?? 'system'} onValueChange={e => setTheme(e.value)}>
                {MODES.map(mode => (
                  <Menu.RadioItem key={mode.value} value={mode.value}>
                    {mode.icon}
                    {mode.label}
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.ItemGroup>
            <Menu.Separator />
            <Menu.Item value="settings" asChild>
              <NextLink href="/settings">
                <LuKeyRound /> Quản trị API-KEY
              </NextLink>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [me, setMe] = useState<CurrentUser | null>(null)

  useEffect(() => {
    RequestServices.getCurrentUser()
      .then(user => setMe(user?.id ? user : null))
      .catch(() => setMe(null))
  }, [])

  return (
    <Flex minHeight="100vh">
      <Box
        as="nav"
        display={{ base: 'none', md: 'block' }}
        position="fixed"
        insetY="0"
        left="0"
        width={SIDEBAR_WIDTH}
        borderRightWidth="1px"
        zIndex="docked"
      >
        <Sidebar pathname={pathname} me={me} onNavigate={() => undefined} />
      </Box>

      <Drawer.Root
        open={mobileOpen}
        onOpenChange={e => setMobileOpen(e.open)}
        placement="start"
        size="xs"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content maxWidth={SIDEBAR_WIDTH}>
              <Sidebar pathname={pathname} me={me} onNavigate={() => setMobileOpen(false)} />
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" top="4" right="3" />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <Box flexGrow={1} minWidth="0" ml={{ md: SIDEBAR_WIDTH }}>
        <HStack
          as="header"
          position="sticky"
          top="0"
          zIndex="sticky"
          height={HEADER_HEIGHT}
          px={{ base: '4', md: '6' }}
          gap="2"
          bg="bg.panel"
          borderBottomWidth="1px"
        >
          <IconButton
            variant="ghost"
            colorPalette="gray"
            ml="-2"
            display={{ md: 'none' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <LuMenu />
          </IconButton>
          <SearchBox />
          <Box flex="1" display={{ base: 'none', md: 'block' }} />
          <HeaderPopover label="Thông báo" icon={<LuBell />} title="Thông báo">
            <Stack align="center" gap="1" py="4" color="fg.muted">
              <LuBell size={28} />
              <Text>Không có thông báo mới</Text>
            </Stack>
          </HeaderPopover>
          <HeaderPopover label="Trợ giúp" icon={<LuCircleHelp />} title="Phím tắt" hideOnMobile>
            <Stack gap="2" color="fg.muted">
              <HStack justify="space-between">
                <Text>Tìm kiếm</Text>
                <Kbd>/</Kbd>
              </HStack>
              <HStack justify="space-between">
                <Text>Gửi ghi chú</Text>
                <Text>
                  <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd>
                </Text>
              </HStack>
              <Text pt="1">Gõ mã phiếu (VD: 162276) rồi Enter để mở nhanh công việc.</Text>
            </Stack>
          </HeaderPopover>
          <ClientOnly>
            <UserMenu me={me} />
          </ClientOnly>
        </HStack>

        <Box as="main" px={{ base: '4', md: '6' }} pb="12">
          <Box maxWidth="1400px" mx="auto" pt={{ base: '4', md: '5' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Flex>
  )
}
