import { describe, expect, it, vi } from 'vitest'

import { API_CATALOG } from '@/services/apiCatalog'
import type { HttpService } from '@/services/httpService'
import { toUserOptions } from '@/services/normalize'
import { RequestServices } from '@/services/requestServices'

const makeService = () => {
  const http = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  }
  return { http, service: new RequestServices(http as unknown as HttpService) }
}

describe('RequestServices', () => {
  it('builds list URLs with query string', async () => {
    const { http, service } = makeService()
    await service.getListRequest({ page: 2, page_size: 10, project_id: undefined })
    expect(http.get).toHaveBeenCalledWith('api/rest/issues?page=2&page_size=10')
    await service.getListRequestByTypeCenIT({ type: 3 })
    expect(http.get).toHaveBeenCalledWith('/mobile_list_request_by_type_cenit.php?type=3')
  })

  it('uses the right verb and path for mutations', async () => {
    const { http, service } = makeService()
    await service.updateRequest({ id: 5, data: { summary: 'x' } })
    expect(http.patch).toHaveBeenCalledWith(
      'api/rest/issues/5',
      { summary: 'x' },
      expect.anything()
    )
    await service.addNoteRequest({ id: 5, data: { text: 'n' } })
    expect(http.post).toHaveBeenCalledWith(
      'api/rest/issues/5/notes',
      { text: 'n' },
      expect.anything()
    )
    await service.deleteRequest(5)
    expect(http.delete).toHaveBeenCalledWith('api/rest/issues/5', {})
    await service.getDetailIssueFiles({ idRequest: 5, idFile: 9 })
    expect(http.get).toHaveBeenCalledWith('api/rest/issues/5/files/9')
  })

  it('catalog covers every service method', () => {
    const { service } = makeService()
    const methods = Object.keys(service).filter(
      k => typeof service[k as keyof RequestServices] === 'function'
    )
    expect(API_CATALOG.map(e => e.name).sort()).toEqual(methods.sort())
  })
})

describe('toUserOptions', () => {
  it('extracts users from nested payloads', () => {
    expect(
      toUserOptions({
        data: { users: [{ id: '3', username: 'an', realname: 'Nguyễn An' }, { foo: 1 }] }
      })
    ).toEqual([{ id: 3, name: 'an', label: 'Nguyễn An (an)' }])
  })
})

describe('calendar helpers', () => {
  it('builds a Monday-first 6-week grid', async () => {
    const { buildMonthGrid, toDateKey } = await import('@/lib/calendar')
    const grid = buildMonthGrid(2026, 8) // September 2026 starts on a Tuesday
    expect(grid).toHaveLength(42)
    expect(toDateKey(grid[0])).toBe('2026-08-31')
    expect(toDateKey(grid[1])).toBe('2026-09-01')
  })

  it('groups issues by due date, falling back to created date', async () => {
    const { groupByDay } = await import('@/lib/calendar')
    const map = groupByDay([
      {
        id: 1,
        summary: 'a',
        due_date: '2026-09-30T00:00:00+07:00',
        created_at: '2026-09-01T10:00:00+07:00'
      },
      { id: 2, summary: 'b', created_at: '2026-09-05T10:00:00+07:00' },
      { id: 3, summary: 'c' }
    ])
    expect(
      [...map.values()]
        .flat()
        .map(i => i.id)
        .sort()
    ).toEqual([1, 2])
    expect(map.size).toBe(2)
  })
})

describe('project search', () => {
  it('matches Vietnamese names without accents', async () => {
    const { normalize } = await import('@/lib/text')
    expect(normalize('Phòng Kế toán – Đào tạo')).toBe('phong ke toan – dao tao')
    expect(normalize('Phòng Kế toán').includes(normalize('ke toan'))).toBe(true)
  })
})

describe('project helpers', () => {
  it('defaults to "Tùy biến chức năng" whatever the accent spelling', async () => {
    const { defaultCategory } = await import('@/lib/projects')
    expect(
      defaultCategory([
        { id: 1, name: 'Hỗ trợ' },
        { id: 2, name: 'Tuỳ biến chức năng' }
      ])
    ).toBe('Tuỳ biến chức năng')
    expect(defaultCategory([{ id: 1, name: 'Hỗ trợ' }])).toBe('Hỗ trợ')
    expect(defaultCategory([])).toBe('')
  })

  it('collects a project and its sub-projects', async () => {
    const { projectWithChildrenIds } = await import('@/lib/projects')
    const projects = [
      {
        id: 1,
        name: 'A',
        subProjects: [{ id: 4, name: 'A1', subProjects: [{ id: 9, name: 'A1a' }] }]
      },
      { id: 2, name: 'B' }
    ]
    expect([...projectWithChildrenIds(projects, '1')].sort()).toEqual(['1', '4', '9'])
    expect([...projectWithChildrenIds(projects, '4')].sort()).toEqual(['4', '9'])
  })
})

describe('weekends', () => {
  it('flags Saturday and Sunday only', async () => {
    const { isWeekend } = await import('@/lib/calendar')
    expect(isWeekend(new Date(2026, 9, 3))).toBe(true) // Sat
    expect(isWeekend(new Date(2026, 9, 4))).toBe(true) // Sun
    expect(isWeekend(new Date(2026, 9, 5))).toBe(false) // Mon
  })
})

describe('duplicate project entries (Mantis stubs)', () => {
  // Same shape as the real server: 312 nested under 15 as a stub, and again at top level in full.
  const projects = [
    { id: 15, name: 'Cha', categories: [], subProjects: [{ id: 312, name: 'KPI' }] },
    {
      id: 312,
      name: 'KPI',
      categories: [
        { id: 1, name: 'Bổ sung chức năng mới' },
        { id: 2, name: 'Tùy biến chức năng' }
      ],
      subProjects: [{ id: 400, name: 'Con' }]
    },
    {
      id: 400,
      name: 'Con',
      categories: [{ id: 3, name: 'Khác' }],
      subProjects: [{ id: 401, name: 'Cháu' }]
    }
  ]

  it('finds the full entry instead of the nested stub', async () => {
    const { findProjectById, defaultCategory } = await import('@/lib/projects')
    const p = findProjectById(projects, '312')
    expect(p?.categories).toHaveLength(2)
    expect(defaultCategory(p?.categories ?? [])).toBe('Tùy biến chức năng')
  })

  it('resolves stubs when collecting sub-projects', async () => {
    const { projectWithChildrenIds } = await import('@/lib/projects')
    expect([...projectWithChildrenIds(projects, '15')].sort()).toEqual(['15', '312', '400', '401'])
  })
})
