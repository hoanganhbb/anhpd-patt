'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useEffect, useState } from 'react'

import PageHeader from '@/components/PageHeader'
import { getErrorMessage } from '@/services/httpService'

interface TokenInfo {
  hasToken: boolean
  token: string
  baseUrl: string
  tokenFile: string
}

type Feedback = { severity: 'success' | 'error' | 'info'; text: string } | null

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
      .catch(err => setFeedback({ severity: 'error', text: getErrorMessage(err) }))
  }, [])

  const run = async (action: () => Promise<Feedback>) => {
    setBusy(true)
    setFeedback(null)
    try {
      setFeedback(await action())
    } catch (err) {
      setFeedback({ severity: 'error', text: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      const { data } = await axios.put<TokenInfo>('/api/token', { token })
      setInfo(data)
      setToken('')
      return { severity: 'success', text: 'Đã ghi vào file txt' }
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
      return { severity: 'info', text: 'Đã đọc API-KEY từ file. Có thể sửa rồi bấm Lưu.' }
    })

  const remove = () =>
    run(async () => {
      if (!window.confirm('Xoá API-KEY khỏi file?')) return null
      const { data } = await axios.delete<TokenInfo>('/api/token')
      setInfo(data)
      setToken('')
      return { severity: 'success', text: 'Đã xoá API-KEY' }
    })

  const verify = () =>
    run(async () => {
      const { data } = await axios.post('/api/token/verify', null, { validateStatus: () => true })
      if (data.ok) {
        const user = data.data?.real_name || data.data?.name || ''
        return {
          severity: 'success',
          text: `API-KEY hợp lệ${user ? ` — người dùng: ${user}` : ''}`
        }
      }
      return {
        severity: 'error',
        text: `API-KEY không hợp lệ (HTTP ${data.status}) ${data.message ?? JSON.stringify(data.data ?? '')}`
      }
    })

  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <PageHeader
        title="Quản trị API-KEY"
        subtitle="Khoá truy cập MantisBT được lưu ở máy chủ, không gửi xuống trình duyệt"
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle2">Trạng thái:</Typography>
              {info?.hasToken ? (
                <Chip color="success" size="small" label={`Đã có API-KEY (${info.token})`} />
              ) : (
                <Chip color="warning" size="small" label="Chưa có API-KEY" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              File API-KEY: <code>{info?.tokenFile}</code>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Máy chủ (MANTIS_BASE_URL):{' '}
              {info?.baseUrl ? <code>{info.baseUrl}</code> : <b>chưa cấu hình trong .env.local</b>}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <TextField
        label="API-KEY"
        placeholder={info?.hasToken ? 'Nhập API-KEY mới để thay thế' : 'Dán API-KEY vào đây'}
        value={token}
        onChange={e => setToken(e.target.value)}
        type={showToken ? 'text' : 'password'}
        autoComplete="off"
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={reveal}
                  aria-label="Đọc API-KEY từ file"
                  disabled={!info?.hasToken}
                >
                  {showToken ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }
        }}
      />

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={save}
          disabled={busy || !token.trim()}
        >
          Lưu
        </Button>
        <Button
          variant="outlined"
          startIcon={<VerifiedUserIcon />}
          onClick={verify}
          disabled={busy}
        >
          Kiểm tra API-KEY
        </Button>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          onClick={remove}
          disabled={busy || !info?.hasToken}
        >
          Xoá API-KEY
        </Button>
      </Stack>

      {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}
    </Stack>
  )
}
