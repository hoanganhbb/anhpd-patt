'use client'

import {
  Badge,
  Button,
  Code,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Stack,
  Text
} from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import {
  LuEye,
  LuEyeOff,
  LuKeyRound,
  LuPlug,
  LuSave,
  LuShieldCheck,
  LuTrash2
} from 'react-icons/lu'

import PageHeader from '@/components/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/ui/field'
import { Panel } from '@/components/ui/panel'
import { getErrorMessage } from '@/services/httpService'

interface TokenInfo {
  hasToken: boolean
  token: string
  baseUrl: string
  tokenFile: string
}

type Feedback = { status: 'success' | 'error' | 'info'; text: string } | null

export default function SettingsPage() {
  const [info, setInfo] = useState<TokenInfo | null>(null)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const fetchInfo = (reveal = false) =>
    axios.get<TokenInfo>('/api/token', { params: { reveal: reveal ? 1 : 0 } }).then(r => r.data)

  const applyInfo = (data: TokenInfo) => {
    setInfo(data)
    return data
  }

  const load = (reveal = false) => fetchInfo(reveal).then(applyInfo)

  useEffect(() => {
    fetchInfo()
      .then(applyInfo)
      .catch(err => setFeedback({ status: 'error', text: getErrorMessage(err) }))
  }, [])

  const run = async (action: () => Promise<Feedback>) => {
    setBusy(true)
    setFeedback(null)
    try {
      setFeedback(await action())
    } catch (err) {
      setFeedback({ status: 'error', text: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      const { data } = await axios.put<TokenInfo>('/api/token', { token })
      setInfo(data)
      setToken('')
      return { status: 'success', text: 'Đã ghi vào file txt' }
    })

  const reveal = () =>
    run(async () => {
      if (showToken) {
        setShowToken(false)
        setToken('')
        return null
      }
      const data = await load(true)
      setToken(data.token)
      setShowToken(true)
      return { status: 'info', text: 'Đã đọc API-KEY từ file. Có thể sửa rồi bấm Lưu.' }
    })

  const remove = () =>
    run(async () => {
      if (!window.confirm('Xoá API-KEY khỏi file?')) return null
      const { data } = await axios.delete<TokenInfo>('/api/token')
      setInfo(data)
      setToken('')
      return { status: 'success', text: 'Đã xoá API-KEY' }
    })

  const verify = () =>
    run(async () => {
      const { data } = await axios.post('/api/token/verify', null, { validateStatus: () => true })
      if (data.ok) {
        const user = data.data?.real_name || data.data?.name || ''
        return {
          status: 'success',
          text: `API-KEY hợp lệ${user ? ` — người dùng: ${user}` : ''}`
        }
      }
      return {
        status: 'error',
        text: `API-KEY không hợp lệ (HTTP ${data.status}) ${data.message ?? JSON.stringify(data.data ?? '')}`
      }
    })

  return (
    <Stack gap="6" maxWidth="760px">
      <PageHeader
        title="Quản trị API-KEY"
        subtitle="Khoá truy cập MantisBT được lưu ở máy chủ, không gửi xuống trình duyệt"
      />

      <Panel icon={<LuPlug />} title="Kết nối MantisBT">
        <Stack gap="2">
          <HStack gap="2">
            <Text textStyle="sm" fontWeight="semibold">
              Trạng thái:
            </Text>
            {info?.hasToken ? (
              <Badge colorPalette="green" variant="solid">
                Đã có API-KEY ({info.token})
              </Badge>
            ) : (
              <Badge colorPalette="orange" variant="solid">
                Chưa có API-KEY
              </Badge>
            )}
          </HStack>
          <Text textStyle="sm" color="fg.muted">
            File API-KEY: <Code>{info?.tokenFile}</Code>
          </Text>
          <Text textStyle="sm" color="fg.muted">
            Máy chủ (MANTIS_BASE_URL):{' '}
            {info?.baseUrl ? <Code>{info.baseUrl}</Code> : <b>chưa cấu hình trong .env.local</b>}
          </Text>
        </Stack>
      </Panel>

      <Panel
        icon={<LuKeyRound />}
        title="API-KEY"
        description="Dán khoá mới rồi bấm Lưu, hoặc kiểm tra khoá hiện có"
        bodyProps={{ gap: '4' }}
      >
        <Field label="API-KEY">
          <InputGroup
            endElement={
              <IconButton
                size="xs"
                variant="ghost"
                colorPalette="gray"
                me="-2"
                onClick={reveal}
                aria-label="Đọc API-KEY từ file"
                disabled={!info?.hasToken}
              >
                {showToken ? <LuEyeOff /> : <LuEye />}
              </IconButton>
            }
          >
            <Input
              bg="bg.panel"
              placeholder={info?.hasToken ? 'Nhập API-KEY mới để thay thế' : 'Dán API-KEY vào đây'}
              value={token}
              onChange={e => setToken(e.target.value)}
              type={showToken ? 'text' : 'password'}
              autoComplete="off"
            />
          </InputGroup>
        </Field>

        <HStack gap="2" wrap="wrap">
          <Button onClick={save} disabled={busy || !token.trim()}>
            <LuSave /> Lưu
          </Button>
          <Button variant="outline" onClick={verify} disabled={busy}>
            <LuShieldCheck /> Kiểm tra API-KEY
          </Button>
          <Button
            variant="ghost"
            colorPalette="red"
            onClick={remove}
            disabled={busy || !info?.hasToken}
          >
            <LuTrash2 /> Xoá API-KEY
          </Button>
        </HStack>

        {feedback && <Alert status={feedback.status}>{feedback.text}</Alert>}
      </Panel>
    </Stack>
  )
}
