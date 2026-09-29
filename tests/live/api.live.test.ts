// Runs every RequestServices method against the real server using the API-KEY in data/token.txt
// and MANTIS_BASE_URL from .env.local.
//   npm run test:api                              -> read-only APIs
//   API_TEST_WRITE=1 npm run test:api             -> also create a test issue, edit it, then delete it
//   API_TEST_PROJECT_ID=<id>                      -> project used for the test issue (default: first project)
// addRemindRequest / deleteUserNotification notify or affect other users and are never run here.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import axios from 'axios'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { HttpService } from '@/services/httpService'
import { RequestServices } from '@/services/requestServices'
import type { Issue, Project } from '@/services/types'

const DATA_DIR = path.resolve(import.meta.dirname, '../../data')
const WRITE = process.env.API_TEST_WRITE === '1'

interface Row {
  api: string
  status: number | string
  ms: number
  note: string
}
const report: Row[] = []
const samples: Record<string, unknown> = {}

let svc: RequestServices
let me: { id: number; name: string } | undefined
let project: Project | undefined
let issue: Issue | undefined
let createdId: number | undefined

const summarize = (data: unknown) => {
  if (data && typeof data === 'object') {
    const keys = Object.keys(data)
    const arr = Object.values(data).find(Array.isArray) as unknown[] | undefined
    return arr ? `${keys.join(',')} (${arr.length} items)` : keys.slice(0, 8).join(',')
  }
  return String(data).slice(0, 80)
}

// Calls one API, records the outcome and asserts a 2xx response.
const call = async <T>(api: string, fn: () => Promise<T>): Promise<T> => {
  const started = performance.now()
  try {
    const data = await fn()
    report.push({
      api,
      status: 200,
      ms: Math.round(performance.now() - started),
      note: summarize(data)
    })
    samples[api] = data
    return data
  } catch (err) {
    const status = axios.isAxiosError(err) ? (err.response?.status ?? err.code ?? 'ERR') : 'ERR'
    const body = axios.isAxiosError(err) ? err.response?.data : String(err)
    const note = (typeof body === 'string' ? body : JSON.stringify(body ?? err)).slice(0, 160)
    report.push({ api, status, ms: Math.round(performance.now() - started), note })
    samples[api] = { error: status, body }
    expect.fail(`${api} -> ${status}: ${note}`)
  }
}

beforeAll(async () => {
  const token = await readFile(path.join(DATA_DIR, 'token.txt'), 'utf8').then(
    t => t.trim(),
    () => ''
  )
  const baseUrl = (process.env.MANTIS_BASE_URL ?? '').trim()
  if (!token || !baseUrl) throw new Error('Cần data/token.txt và MANTIS_BASE_URL trong .env.local')

  const client = axios.create({
    baseURL: `${baseUrl.replace(/\/+$/, '')}/`,
    timeout: 30000,
    headers: { 'API-KEY': token, 'Content-Type': 'application/json' }
  })
  svc = new RequestServices(new HttpService(client))
  me = (await client.get('api/rest/users/me').catch(() => ({ data: undefined }))).data
})

afterAll(async () => {
  console.table(report)
  await writeFile(
    path.join(DATA_DIR, 'api-report.json'),
    JSON.stringify({ report, samples }, null, 2)
  )
})

describe('read APIs', () => {
  it('getProjectList', async () => {
    const res = await call('getProjectList', () => svc.getProjectList())
    const wanted = process.env.API_TEST_PROJECT_ID
    project = res.projects.find(p => String(p.id) === wanted) ?? res.projects[0]
  })

  it('getListRequest', async () => {
    const res = await call('getListRequest', () => svc.getListRequest({ page_size: 10, page: 1 }))
    issue = res.issues[0]
  })

  it('getListRequestByType', () =>
    call('getListRequestByType', () => svc.getListRequestByType({ page: 1 })))
  it('getListRequestByTypeCenIT', () =>
    call('getListRequestByTypeCenIT', () => svc.getListRequestByTypeCenIT({ page: 1 })))
  it('getListRequestDueDate', () =>
    call('getListRequestDueDate', () => svc.getListRequestDueDate({ page: 1 })))

  it('getDetailIssue', async ({ skip }) => {
    if (!issue) skip()
    const res = await call('getDetailIssue', () => svc.getDetailIssue(issue!.id))
    issue = res.issues[0]
  })

  it('getListDetailIssueFiles', ({ skip }) => {
    if (!issue) skip()
    return call('getListDetailIssueFiles', () => svc.getListDetailIssueFiles(issue!.id))
  })

  it('getDetailIssueFiles', ({ skip }) => {
    const file = issue?.attachments?.[0]
    if (!file) skip()
    return call('getDetailIssueFiles', () =>
      svc.getDetailIssueFiles({ idRequest: issue!.id, idFile: file!.id })
    )
  })

  it('getPermissionRequest', ({ skip }) => {
    if (!issue) skip()
    return call('getPermissionRequest', () => svc.getPermissionRequest(issue!.id))
  })

  it('getLstHandlerRequest', ({ skip }) => {
    if (!issue) skip()
    return call('getLstHandlerRequest', () => svc.getLstHandlerRequest(issue!.id))
  })

  it('getLstManageProject', ({ skip }) => {
    if (!project) skip()
    return call('getLstManageProject', () => svc.getLstManageProject(project!.id))
  })

  it('getLstHandlerProject', ({ skip }) => {
    if (!project) skip()
    return call('getLstHandlerProject', () => svc.getLstHandlerProject(project!.id))
  })

  it('getFilter', ({ skip }) => {
    if (!me) skip()
    return call('getFilter', () => svc.getFilter(me!.id))
  })

  it('getUserHandlerRequest', ({ skip }) => {
    if (!me) skip()
    return call('getUserHandlerRequest', () => svc.getUserHandlerRequest(me!.id))
  })
})

describe.runIf(WRITE)('write APIs (on a temporary test issue)', () => {
  it('postNewRequest', async () => {
    const res = await call('postNewRequest', () =>
      svc.postNewRequest({
        summary: `[TEST API] ${new Date().toISOString()}`,
        description: 'Phiếu tạo tự động bởi npm run test:api, sẽ bị xoá ngay.',
        project: { id: project!.id },
        category: project!.categories?.[0] ? { name: project!.categories[0].name } : undefined
      })
    )
    createdId = res.issue.id
  })

  it('addNoteRequest', ({ skip }) => {
    if (!createdId) skip()
    return call('addNoteRequest', () =>
      svc.addNoteRequest({
        id: createdId!,
        data: { text: 'Ghi chú kiểm thử', view_state: { name: 'public' } }
      })
    )
  })

  it('updateRequest', ({ skip }) => {
    if (!createdId) skip()
    return call('updateRequest', () =>
      svc.updateRequest({ id: createdId!, data: { summary: `[TEST API] đã sửa ${Date.now()}` } })
    )
  })

  it('updateReportRequest', ({ skip }) => {
    if (!createdId || !me) skip()
    return call('updateReportRequest', () =>
      svc.updateReportRequest({ id: createdId!, handler: { handler: { id: me!.id } } })
    )
  })

  it('addMonitorRequest', ({ skip }) => {
    if (!createdId) skip()
    return call('addMonitorRequest', () => svc.addMonitorRequest(createdId!))
  })

  it('deleteMonitorRequest', ({ skip }) => {
    if (!createdId) skip()
    return call('deleteMonitorRequest', () => svc.deleteMonitorRequest(createdId!))
  })

  it('toggleStickRequest', ({ skip }) => {
    if (!createdId) skip()
    return call('toggleStickRequest', () =>
      svc.toggleStickRequest({ id: createdId!, sticky: true })
    )
  })

  it('deleteRequest', ({ skip }) => {
    if (!createdId) skip()
    return call('deleteRequest', () => svc.deleteRequest(createdId!))
  })
})
