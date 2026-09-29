'use client'

import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useState } from 'react'

import PageHeader from '@/components/PageHeader'
import { API_CATALOG, callApi, type ApiEntry, type ApiKind } from '@/services/apiCatalog'
import RequestServices from '@/services/requestServices'

interface Result {
  ok: boolean
  status?: number
  ms: number
  body: unknown
}

const KIND_CHIP: Record<ApiKind, { label: string; color: 'success' | 'warning' | 'error' }> = {
  read: { label: 'đọc', color: 'success' },
  write: { label: 'ghi', color: 'warning' },
  danger: { label: 'nguy hiểm', color: 'error' }
}

const pretty = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return text && text.length > 20000 ? `${text.slice(0, 20000)}\n… (đã cắt bớt)` : text
}

export default function ApiTestPage() {
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries(API_CATALOG.map(e => [e.name, JSON.stringify(e.sample, null, 2)]))
  )
  const [results, setResults] = useState<Record<string, Result>>({})
  const [running, setRunning] = useState<string | null>(null)

  const run = async (entry: ApiEntry) => {
    setRunning(entry.name)
    const started = performance.now()
    let result: Result
    try {
      const arg = JSON.parse(params[entry.name] || 'null')
      const body = await callApi(RequestServices, entry.name, arg)
      result = { ok: true, status: 200, ms: 0, body }
    } catch (err) {
      result = axios.isAxiosError(err)
        ? {
            ok: false,
            status: err.response?.status,
            ms: 0,
            body: err.response?.data ?? err.message
          }
        : { ok: false, ms: 0, body: String(err) }
    }
    result.ms = Math.round(performance.now() - started)
    setResults(r => ({ ...r, [entry.name]: result }))
    setRunning(null)
  }

  const runAllReads = async () => {
    for (const entry of API_CATALOG.filter(e => e.kind === 'read')) await run(entry)
  }

  const passed = Object.values(results).filter(r => r.ok).length

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Kiểm thử API"
        subtitle="Gọi thử từng phương thức của RequestServices qua proxy"
        actions={
          <Button
            variant="contained"
            startIcon={<PlaylistPlayIcon />}
            onClick={runAllReads}
            disabled={!!running}
          >
            Chạy tất cả API đọc
          </Button>
        }
      />
      <Alert severity="info">
        Tham số nhập dạng JSON: số (id) hoặc object. API <b>ghi</b>/<b>nguy hiểm</b> thay đổi dữ
        liệu thật, chỉ chạy từng cái. Đã chạy {Object.keys(results).length}, thành công {passed}.
      </Alert>
      <div>
        {API_CATALOG.map(entry => {
          const result = results[entry.name]
          return (
            <Accordion key={entry.name} variant="outlined" disableGutters>
              <AccordionSummary>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip size="small" {...KIND_CHIP[entry.kind]} />
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {entry.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {entry.method} {entry.path}
                  </Typography>
                  {result && (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={result.ok ? 'success' : 'error'}
                      label={`${result.status ?? 'ERR'} · ${result.ms}ms`}
                    />
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  <TextField
                    label="Tham số (JSON)"
                    value={params[entry.name]}
                    onChange={e => setParams(p => ({ ...p, [entry.name]: e.target.value }))}
                    multiline
                    minRows={1}
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
                  />
                  <Button
                    variant="outlined"
                    color={
                      entry.kind === 'read'
                        ? 'primary'
                        : entry.kind === 'write'
                          ? 'warning'
                          : 'error'
                    }
                    startIcon={<PlayArrowIcon />}
                    onClick={() => {
                      if (
                        entry.kind !== 'read' &&
                        !window.confirm(`Chạy ${entry.name}? API này thay đổi dữ liệu thật.`)
                      )
                        return
                      run(entry)
                    }}
                    disabled={!!running}
                    sx={{ alignSelf: 'start' }}
                  >
                    {running === entry.name ? 'Đang chạy…' : 'Chạy'}
                  </Button>
                  {result && (
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 12,
                        maxHeight: 400,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}
                    >
                      {pretty(result.body)}
                    </pre>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </div>
    </Stack>
  )
}
