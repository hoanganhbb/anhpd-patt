'use client'

import AddTaskIcon from '@mui/icons-material/AddTask'
import ApiIcon from '@mui/icons-material/Api'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import KeyIcon from '@mui/icons-material/Key'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import ListAltIcon from '@mui/icons-material/ListAlt'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import MenuIcon from '@mui/icons-material/Menu'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightnessOutlined'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { alpha, ThemeProvider, useColorScheme } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import RequestServices from '@/services/requestServices'
import type { CurrentUser } from '@/services/types'
import theme from '@/theme'

import UserAvatar from './UserAvatar'

const DRAWER_WIDTH = 256

const NAV_GROUPS = [
  {
    title: 'Công việc',
    items: [
      { href: '/', label: 'Danh sách công việc', icon: <ListAltIcon /> },
      { href: '/calendar', label: 'Lịch của tôi', icon: <CalendarMonthIcon /> },
      { href: '/issues/new', label: 'Tạo công việc', icon: <AddTaskIcon /> },
      { href: '/issues/import', label: 'Nhập từ Excel', icon: <UploadFileIcon /> }
    ]
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/api-test', label: 'Kiểm thử API', icon: <ApiIcon /> },
      { href: '/settings', label: 'Quản trị API-KEY', icon: <KeyIcon /> }
    ]
  }
]

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items)

const TODAY_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' })

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' || /^\/issues\/\d+/.test(pathname) : pathname.startsWith(href)

const MODES = ['system', 'light', 'dark'] as const
const MODE_META = {
  system: { label: 'Theo hệ thống', icon: <SettingsBrightnessIcon /> },
  light: { label: 'Sáng', icon: <LightModeIcon /> },
  dark: { label: 'Tối', icon: <DarkModeIcon /> }
}

function ColorModeButton() {
  const { mode, setMode } = useColorScheme()
  const current = mode ?? 'system'
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length]
  return (
    <Tooltip title={`Giao diện: ${MODE_META[current].label}`}>
      <IconButton onClick={() => setMode(next)} aria-label="Đổi giao diện sáng/tối">
        {MODE_META[current].icon}
      </IconButton>
    </Tooltip>
  )
}

function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const [me, setMe] = useState<CurrentUser | null>(null)

  useEffect(() => {
    RequestServices.getCurrentUser()
      .then(user => setMe(user?.id ? user : null))
      .catch(() => setMe(null))
  }, [])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, height: 64 }}>
        <Avatar
          variant="rounded"
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            color: '#fff',
            background: 'linear-gradient(135deg, #8b8bf0 0%, #5b5bd6 55%, #0ea5a4 130%)',
            boxShadow: `0 6px 16px -6px ${alpha('#5b5bd6', 0.7)}`
          }}
        >
          <AssignmentIcon fontSize="small" />
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>Phiếu công việc</Typography>
          <Typography variant="caption" color="text.secondary">
            MantisBT
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {NAV_GROUPS.map(group => (
          <Box key={group.title} sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1.5, fontSize: 11, display: 'block' }}
            >
              {group.title}
            </Typography>
            <List disablePadding sx={{ display: 'grid', gap: 0.5 }}>
              {group.items.map(item => {
                const active = isActive(pathname, item.href)
                return (
                  <ListItemButton
                    key={item.href}
                    component={Link}
                    href={item.href}
                    onClick={onNavigate}
                    selected={active}
                    sx={{
                      py: 0.9,
                      color: active ? 'primary.main' : 'text.secondary',
                      '&.Mui-selected': {
                        bgcolor: t => t.alpha((t.vars || t).palette.primary.main, 0.1),
                        '&:hover': {
                          bgcolor: t => t.alpha((t.vars || t).palette.primary.main, 0.14)
                        }
                      },
                      '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 36 }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: { sx: { fontSize: 14, fontWeight: active ? 600 : 500 } }
                      }}
                    />
                  </ListItemButton>
                )
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          m: 1.5,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: 3,
          bgcolor: 'action.hover'
        }}
      >
        <UserAvatar name={me?.real_name || me?.name} size={34} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {me ? me.real_name || me.name : 'Chưa kết nối'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {me?.email ?? (me ? `@${me.name}` : 'Cấu hình API-KEY')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = ALL_NAV.find(item => isActive(pathname, item.href))

  const paperSx = {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    borderRight: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper'
  } as const

  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
            bgcolor: t => t.alpha((t.vars || t).palette.background.default, 0.75),
            backdropFilter: 'saturate(180%) blur(12px)',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(o => !o)}
              sx={{ display: { md: 'none' } }}
              aria-label="Mở menu"
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ display: { xs: 'block', md: 'none' }, flexGrow: 1 }}
            >
              {current?.label ?? 'Chi tiết công việc'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              suppressHydrationWarning
              sx={{
                display: { xs: 'none', md: 'block' },
                flexGrow: 1,
                textTransform: 'capitalize'
              }}
            >
              {TODAY_FORMAT.format(new Date())}
            </Typography>
            <ColorModeButton />
          </Toolbar>
        </AppBar>

        <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': paperSx }}
          >
            <Sidebar pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </Drawer>
          <Drawer
            variant="permanent"
            open
            sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': paperSx }}
          >
            <Sidebar pathname={pathname} onNavigate={() => undefined} />
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            px: { xs: 2, md: 4 },
            pb: 6,
            bgcolor: 'background.default'
          }}
        >
          <Toolbar />
          <Box sx={{ maxWidth: 1440, mx: 'auto', pt: { xs: 2, md: 3 } }}>{children}</Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
