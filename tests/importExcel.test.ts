import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import {
  ImportFileError,
  parseDateCell,
  projectsNeedingHandlers,
  readWorkbook,
  resolveRows
} from '@/lib/importParser'
import { ROW_DATA_FIRST, ROW_HEADER, SHEET_NAME } from '@/lib/importSchema'
import { buildTemplate } from '@/lib/importTemplate'
import type { UserOption } from '@/services/normalize'
import type { Project } from '@/services/types'

const projects: Project[] = [
  {
    id: 1,
    name: 'Cha',
    categories: [{ id: 1, name: 'Hỗ trợ' }],
    subProjects: [{ id: 2, name: 'Kế toán' }]
  },
  {
    id: 2,
    name: 'Kế toán',
    categories: [
      { id: 5, name: 'Bổ sung chức năng mới' },
      { id: 6, name: 'Tùy biến chức năng' }
    ]
  },
  { id: 3, name: 'Nhân sự', categories: [{ id: 7, name: 'Hỗ trợ' }] }
]
const handlers: UserOption[] = [
  { id: 10, name: 'an', label: 'Nguyễn An (an)' },
  { id: 11, name: 'binh', label: 'Trần Bình (binh)' }
]
const toDueDate = (key: string) => `${key}T00:00:00+07:00`

type Cell = string | number | Date

// Fill the template's data rows: values[0] goes to column B (Dự án).
const fill = async (rows: Cell[][]) => {
  const buffer = await buildTemplate({ projects, handlers, now: new Date(2026, 8, 29) })
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.getWorksheet(SHEET_NAME)!
  rows.forEach((values, i) =>
    values.forEach((v, c) => {
      if (v !== '') ws.getCell(ROW_DATA_FIRST + i, c + 2).value = v
    })
  )
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

describe('import template', () => {
  it('has the input table and lookup lists on one sheet, with dropdowns', async () => {
    const buffer = await buildTemplate({ projects, handlers, now: new Date(2026, 8, 29) })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    expect(wb.worksheets.map(w => w.name)).toEqual([SHEET_NAME])
    const ws = wb.worksheets[0]
    expect(ws.getCell(ROW_HEADER, 2).value).toBe('Dự án (*)')
    expect(ws.getCell(ROW_HEADER, 4).value).toBe('Tiêu đề (*)')
    // Lookup lists to the right: project paths, category pairs, priorities, handlers.
    expect(ws.getCell(ROW_HEADER + 1, 13).value).toBe('Cha')
    expect(ws.getCell(ROW_HEADER + 2, 13).value).toBe('Cha / Kế toán')
    expect(ws.getCell(ROW_HEADER + 1, 16).value).toBe('Hỗ trợ')
    expect(ws.getCell(ROW_HEADER + 1, 18).value).toBe('Không')
    expect(ws.getCell(ROW_HEADER + 1, 20).value).toBe('Nguyễn An (an)')
    const category = ws.getCell(ROW_DATA_FIRST, 3).dataValidation
    expect(category.type).toBe('list')
    expect(category.formulae?.[0]).toContain('OFFSET(')
    expect(ws.getCell(ROW_DATA_FIRST, 2).dataValidation.formulae?.[0]).toBe('$M$8:$M$10')
  })

  it('skips the example rows and empty rows when reading it back', async () => {
    const buffer = await buildTemplate({ projects, handlers })
    expect(await readWorkbook(buffer)).toEqual([])
  })
})

describe('reading a filled sheet', () => {
  it('reads text and dates however Excel stored them', async () => {
    const buffer = await fill([
      [
        'Nhân sự',
        '',
        'Tạo tài khoản',
        'Mô tả',
        'Cao',
        'Trần Bình (binh)',
        new Date(Date.UTC(2026, 9, 5)),
        'ghi chú'
      ],
      ['3', '', 'Dòng 2', '', '', '', '31/12/2026', '']
    ])
    const rows = await readWorkbook(buffer)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      row: ROW_DATA_FIRST,
      project: 'Nhân sự',
      summary: 'Tạo tài khoản',
      priority: 'Cao',
      dueDate: '2026-10-05'
    })
    expect(rows[1].dueDate).toBe('2026-12-31')
    expect(projectsNeedingHandlers(rows, projects)).toEqual(['3'])
  })

  it('rejects files that are not the template', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('x').getCell('A1').value = 'hello'
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer
    await expect(readWorkbook(buffer)).rejects.toBeInstanceOf(ImportFileError)
    await expect(readWorkbook(new ArrayBuffer(8))).rejects.toBeInstanceOf(ImportFileError)
  })
})

describe('parseDateCell', () => {
  it('normalises dates and keeps garbage for the error message', () => {
    expect(parseDateCell('5/9/2026')).toBe('2026-09-05')
    expect(parseDateCell('2026-09-05')).toBe('2026-09-05')
    expect(parseDateCell(46300)).toBe('2026-10-05')
    expect(parseDateCell('31/02/2026')).toBe('31/02/2026')
    expect(parseDateCell('mai')).toBe('mai')
    expect(parseDateCell(null)).toBe('')
  })
})

describe('resolveRows', () => {
  const base = {
    row: 10,
    project: '',
    category: '',
    summary: '',
    description: '',
    priority: '',
    handler: '',
    dueDate: '',
    additional: ''
  }
  const run = (over: Partial<typeof base>[]) =>
    resolveRows(
      over.map((o, i) => ({ ...base, row: 10 + i, ...o })),
      { projects, handlersByProject: { '3': handlers, '2': handlers }, toDueDate }
    )

  it('builds the API payload with defaults', () => {
    const [row] = run([{ project: 'Cha / Kế toán', summary: ' Việc A ' }])
    expect(row.errors).toEqual([])
    expect(row.payload).toEqual({
      summary: 'Việc A',
      description: 'Việc A',
      project: { id: 2 },
      category: { name: 'Tùy biến chức năng' },
      priority: { name: 'normal' },
      handler: undefined,
      due_date: undefined,
      additional_information: undefined
    })
  })

  it('resolves priority, handler and dates however they were typed', () => {
    const [row] = run([
      {
        project: '3',
        category: 'ho tro',
        summary: 'B',
        priority: 'khan',
        handler: 'binh',
        dueDate: '2026-10-05'
      }
    ])
    expect(row.errors).toEqual([])
    expect(row.payload).toMatchObject({
      project: { id: 3 },
      category: { name: 'Hỗ trợ' },
      priority: { name: 'urgent' },
      handler: { id: 11 },
      due_date: '2026-10-05T00:00:00+07:00'
    })
  })

  it('reports every problem in Vietnamese instead of guessing', () => {
    const rows = run([
      { project: '', summary: '' },
      { project: 'Không có', summary: 'x' },
      { project: 'Kế toán', summary: 'x' },
      {
        project: 'Nhân sự',
        summary: 'x',
        category: 'Sai',
        priority: 'gấp',
        handler: 'ai đó',
        dueDate: 'mai'
      },
      { project: 'Nhân sự', summary: 'y'.repeat(129) }
    ])
    expect(rows[0].errors).toEqual(['Thiếu tiêu đề', 'Thiếu dự án'])
    expect(rows[1].errors).toEqual(['Không tìm thấy dự án "Không có"'])
    // "Kế toán" is unique by name (the stub and the full entry are the same project id).
    expect(rows[2].errors).toEqual([])
    expect(rows[3].errors).toEqual([
      'Danh mục "Sai" không thuộc dự án này',
      'Ưu tiên "gấp" không hợp lệ',
      '"ai đó" không phải người xử lý của dự án',
      'Hạn xử lý "mai" không đúng dạng dd/mm/yyyy'
    ])
    expect(rows[4].errors[0]).toMatch(/Tiêu đề dài 129/)
    expect(rows.map(r => !!r.payload)).toEqual([false, false, true, false, false])
  })

  it('warns about duplicate rows', () => {
    const rows = run([
      { project: 'Nhân sự', summary: 'Trùng' },
      { project: 'Nhân sự', summary: 'trùng' }
    ])
    expect(rows[1].warnings).toEqual(['Trùng với dòng 10'])
    expect(rows[1].payload).toBeDefined()
  })
})
