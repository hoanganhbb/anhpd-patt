'use client'

import { Accordion, Badge, Box, Button, HStack, Stack, Text, Textarea } from '@chakra-ui/react'
import axios from 'axios'
import { useState } from 'react'
import { LuListVideo, LuPlay } from 'react-icons/lu'

import PageHeader from '@/components/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/ui/field'
import { API_CATALOG, callApi, type ApiEntry, type ApiKind } from '@/services/apiCatalog'
import RequestServices from '@/services/requestServices'

interface Result {
  ok: boolean
  status?: number
  ms: number
  body: unknown
}

const KIND_CHIP: Record<ApiKind, { label: string; color: string; button: string }> = {
  read: { label: 'đọc', color: 'green', button: 'brand' },
  write: { label: 'ghi', color: 'orange', button: 'orange' },
  danger: { label: 'nguy hiểm', color: 'red', button: 'red' }
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
    <Stack gap="4">
      <PageHeader
        title="Kiểm thử API"
        subtitle="Gọi thử từng phương thức của RequestServices qua proxy"
        actions={
          <Button onClick={runAllReads} disabled={!!running}>
            <LuListVideo /> Chạy tất cả API đọc
          </Button>
        }
      />
      <Alert status="info">
        Tham số nhập dạng JSON: số (id) hoặc object. API <b>ghi</b>/<b>nguy hiểm</b> thay đổi dữ
        liệu thật, chỉ chạy từng cái. Đã chạy {Object.keys(results).length}, thành công {passed}.
      </Alert>
      <Accordion.Root multiple collapsible variant="enclosed" bg="bg.panel">
        {API_CATALOG.map(entry => {
          const result = results[entry.name]
          const kind = KIND_CHIP[entry.kind]
          return (
            <Accordion.Item key={entry.name} value={entry.name}>
              <Accordion.ItemTrigger cursor="pointer">
                <HStack as="span" gap="2" wrap="wrap" flex="1">
                  <Badge colorPalette={kind.color} variant="solid">
                    {kind.label}
                  </Badge>
                  <Text as="span" fontFamily="mono" fontWeight="semibold">
                    {entry.name}
                  </Text>
                  <Text as="span" textStyle="sm" color="fg.muted" fontFamily="mono">
                    {entry.method} {entry.path}
                  </Text>
                  {result && (
                    <Badge colorPalette={result.ok ? 'green' : 'red'} variant="outline">
                      {result.status ?? 'ERR'} · {result.ms}ms
                    </Badge>
                  )}
                </HStack>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody>
                  <Stack gap="2">
                    <Field label="Tham số (JSON)">
                      <Textarea
                        value={params[entry.name]}
                        onChange={e => setParams(p => ({ ...p, [entry.name]: e.target.value }))}
                        autoresize
                        rows={1}
                        fontFamily="mono"
                        fontSize="13px"
                      />
                    </Field>
                    <Button
                      variant="outline"
                      colorPalette={kind.button}
                      onClick={() => {
                        if (
                          entry.kind !== 'read' &&
                          !window.confirm(`Chạy ${entry.name}? API này thay đổi dữ liệu thật.`)
                        )
                          return
                        run(entry)
                      }}
                      disabled={!!running}
                      alignSelf="start"
                    >
                      <LuPlay /> {running === entry.name ? 'Đang chạy…' : 'Chạy'}
                    </Button>
                    {result && (
                      <Box
                        as="pre"
                        m="0"
                        fontSize="12px"
                        maxHeight="400px"
                        overflow="auto"
                        whiteSpace="pre-wrap"
                        wordBreak="break-all"
                      >
                        {pretty(result.body)}
                      </Box>
                    )}
                  </Stack>
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          )
        })}
      </Accordion.Root>
    </Stack>
  )
}
