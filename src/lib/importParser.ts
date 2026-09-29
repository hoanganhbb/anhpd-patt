import ExcelJS from 'exceljs'

import type { UserOption } from '@/services/normalize'
import { PRIORITIES, type Project } from '@/services/types'

import {
  MAX_ROWS,
  ROW_HEADER,
  SHEET_NAME,
  headerKey,
  isSampleMark,
  type ColumnKey
} from './importSchema'
import { defaultCategory, findProjectById, flattenProjects } from './projects'
import { normalize } from './text'

// ---------- Reading the workbook ----------

export interface RawRow {
  // 1-based row number in the sheet, shown in error messages.
  row: number
  project: string
  category: string
  summary: string
  description: string
  priority: string
  handler: string
  // Already a yyyy-mm-dd key, or the untouched text when it could not be understood.
  dueDate: string
  additional: string
}

export class ImportFileError extends Error {}

const pad = (n: number) => String(n).padStart(2, '0')

// Excel serial day number (1900 system) -> Date at UTC midnight.
const fromSerial = (serial: number) => new Date(Math.round((serial - 25569) * 86400 * 1000))

const cellText = (value: ExcelJS.CellValue): string => {
  if (value == null) return ''
  if (value instanceof Date)
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map(part => part.text).join('')
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue)
    if ('text' in value) return cellText(value.text as ExcelJS.CellValue)
    if ('error' in value) return ''
  }
  return String(value).trim()
}

const isRealDate = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

// Accepts an Excel date/serial, "dd/mm/yyyy", "d-m-yyyy", "dd.mm.yyyy" or "yyyy-mm-dd".
// Returns yyyy-mm-dd, or the original text when it is not a real date.
export const parseDateCell = (value: ExcelJS.CellValue): string => {
  if (typeof value === 'number') return cellText(fromSerial(value))
  const text = cellText(value)
  if (!text) return ''
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  const ymd = text.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/)
  const [y, m, d] = dmy ? [+dmy[3], +dmy[2], +dmy[1]] : ymd ? [+ymd[1], +ymd[2], +ymd[3]] : []
  return y && m && d && isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : text
}

export async function readWorkbook(buffer: ArrayBuffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer)
  } catch {
    throw new ImportFileError('Không đọc được tệp. Hãy dùng tệp .xlsx (Excel 2007 trở lên).')
  }

  // Prefer the template's own sheet, otherwise the first sheet that has a recognisable header.
  const sheets = [...wb.worksheets].sort(
    (a, b) => Number(b.name === SHEET_NAME) - Number(a.name === SHEET_NAME)
  )
  for (const ws of sheets) {
    const header = findHeader(ws)
    if (header) return readRows(ws, header.row, header.columns)
  }
  throw new ImportFileError(
    'Không tìm thấy dòng tiêu đề (Dự án, Tiêu đề…). Hãy dùng đúng tệp mẫu do hệ thống cung cấp.'
  )
}

type ColumnMap = Partial<Record<ColumnKey, number>>

// The header row holds a run of adjacent header cells; the lookup lists further right are
// separated by blank spacer columns so they are never read as data columns.
function findHeader(ws: ExcelJS.Worksheet): { row: number; columns: ColumnMap } | undefined {
  const scanTo = Math.min(ws.rowCount, ROW_HEADER + 20)
  for (let r = 1; r <= scanTo; r++) {
    const columns: ColumnMap = {}
    for (let c = 1; c <= 15; c++) {
      const text = cellText(ws.getCell(r, c).value)
      if (!text) {
        if (c > 1 && Object.keys(columns).length) break
        continue
      }
      const key = headerKey(text)
      if (key && columns[key] === undefined) columns[key] = c
    }
    if (columns.summary && columns.project) return { row: r, columns }
  }
}

function readRows(ws: ExcelJS.Worksheet, headerRow: number, columns: ColumnMap): RawRow[] {
  const get = (r: number, key: ColumnKey) =>
    columns[key] ? ws.getCell(r, columns[key]).value : null
  const rows: RawRow[] = []
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    if (isSampleMark(cellText(get(r, 'stt')))) continue
    const raw: RawRow = {
      row: r,
      project: cellText(get(r, 'project')),
      category: cellText(get(r, 'category')),
      summary: cellText(get(r, 'summary')),
      description: cellText(get(r, 'description')),
      priority: cellText(get(r, 'priority')),
      handler: cellText(get(r, 'handler')),
      dueDate: parseDateCell(get(r, 'dueDate')),
      additional: cellText(get(r, 'additional'))
    }
    // The STT column is pre-filled, so a row only counts once another cell has content.
    if (!Object.entries(raw).some(([key, value]) => key !== 'row' && value)) continue
    rows.push(raw)
    if (rows.length > MAX_ROWS * 2) break
  }
  return rows
}

// ---------- Validating against the server's data ----------

export interface IssuePayload {
  summary: string
  description: string
  project: { id: number }
  category?: { name: string }
  priority: { name: string }
  handler?: { id: number }
  due_date?: string
  additional_information?: string
}

export interface ImportContext {
  projects: Project[]
  // Handlers of each project (by project id), needed only for rows that name a handler.
  handlersByProject: Record<string, UserOption[]>
  // Builds the API date from "yyyy-mm-dd" (timezone aware); injected so tests stay deterministic.
  toDueDate: (dateKey: string) => string
}

export interface ImportRow {
  raw: RawRow
  errors: string[]
  warnings: string[]
  // Resolved display values.
  projectPath: string
  category: string
  priorityLabel: string
  handlerLabel: string
  payload?: IssuePayload
}

const SUMMARY_MAX = 128

const same = (a: string, b: string) => normalize(a) === normalize(b)

// Project cell -> project id: by id, exact path, or unique name.
export const matchProject = (
  projects: Project[],
  text: string
): { id: string; path: string } | 'ambiguous' | undefined => {
  const options = flattenProjects(projects)
  const value = text.trim()
  const byId = /^\d+$/.test(value) ? options.find(o => o.id === value) : undefined
  const byPath = options.find(o => same(o.path, value))
  const hit = byId ?? byPath
  if (hit) return hit
  const byName = options.filter(o => same(o.name, value))
  if (byName.length === 1) return byName[0]
  return byName.length ? 'ambiguous' : undefined
}

// Project ids of the rows that name a handler, so the page only fetches those handler lists.
export const projectsNeedingHandlers = (rows: RawRow[], projects: Project[]) => {
  const ids = new Set<string>()
  for (const r of rows) {
    const hit = r.handler ? matchProject(projects, r.project) : undefined
    if (hit && hit !== 'ambiguous') ids.add(hit.id)
  }
  return [...ids]
}

const matchHandler = (handlers: UserOption[], text: string) => {
  const value = normalize(text)
  const found = handlers.filter(
    h => normalize(h.label) === value || normalize(h.name) === value || String(h.id) === value
  )
  if (found.length) return found
  // "Nguyễn An" alone, or an "(an)" suffix.
  return handlers.filter(h => normalize(h.label).startsWith(`${value} (`))
}

export function resolveRows(raws: RawRow[], ctx: ImportContext): ImportRow[] {
  const seen = new Map<string, number>()
  return raws.map(raw => {
    const row: ImportRow = {
      raw,
      errors: [],
      warnings: [],
      projectPath: raw.project,
      category: raw.category,
      priorityLabel: raw.priority,
      handlerLabel: raw.handler
    }
    const { errors, warnings } = row

    const summary = raw.summary.trim()
    if (!summary) errors.push('Thiếu tiêu đề')
    else if (summary.length > SUMMARY_MAX)
      errors.push(`Tiêu đề dài ${summary.length}/${SUMMARY_MAX} ký tự`)

    // Project
    let projectId = ''
    if (!raw.project) errors.push('Thiếu dự án')
    else {
      const project = matchProject(ctx.projects, raw.project)
      if (project === 'ambiguous')
        errors.push(`Tên dự án "${raw.project}" trùng nhiều dự án, hãy chọn từ danh sách`)
      else if (!project) errors.push(`Không tìm thấy dự án "${raw.project}"`)
      else {
        projectId = project.id
        row.projectPath = project.path
      }
    }

    // Category
    let category = ''
    if (projectId) {
      const categories = findProjectById(ctx.projects, projectId)?.categories ?? []
      if (raw.category) {
        const hit = categories.find(c => same(c.name, raw.category))
        if (hit) category = hit.name
        else errors.push(`Danh mục "${raw.category}" không thuộc dự án này`)
      } else {
        category = defaultCategory(categories)
        if (!category) warnings.push('Dự án chưa có danh mục')
      }
      row.category = category
    }

    // Priority
    let priorityName = 'normal'
    if (raw.priority) {
      const hit = PRIORITIES.find(
        p =>
          same(p.label, raw.priority) || same(p.name, raw.priority) || String(p.id) === raw.priority
      )
      if (hit) {
        priorityName = hit.name
        row.priorityLabel = hit.label
      } else errors.push(`Ưu tiên "${raw.priority}" không hợp lệ`)
    } else row.priorityLabel = PRIORITIES.find(p => p.name === priorityName)?.label ?? ''

    // Handler
    let handlerId: number | undefined
    if (raw.handler && projectId) {
      const found = matchHandler(ctx.handlersByProject[projectId] ?? [], raw.handler)
      if (found.length === 1) {
        handlerId = found[0].id
        row.handlerLabel = found[0].label
      } else if (found.length > 1) errors.push(`Người xử lý "${raw.handler}" trùng nhiều người`)
      else errors.push(`"${raw.handler}" không phải người xử lý của dự án`)
    }

    // Due date
    let dueDate: string | undefined
    if (raw.dueDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate)) dueDate = ctx.toDueDate(raw.dueDate)
      else errors.push(`Hạn xử lý "${raw.dueDate}" không đúng dạng dd/mm/yyyy`)
    }

    // The same task twice in one file is usually a paste mistake.
    if (summary && projectId) {
      const key = `${projectId}|${normalize(summary)}`
      const first = seen.get(key)
      if (first) warnings.push(`Trùng với dòng ${first}`)
      else seen.set(key, raw.row)
    }

    if (!errors.length) {
      row.payload = {
        summary,
        // Mantis requires a description, fall back to the summary.
        description: raw.description.trim() || summary,
        project: { id: Number(projectId) },
        category: category ? { name: category } : undefined,
        priority: { name: priorityName },
        handler: handlerId ? { id: handlerId } : undefined,
        due_date: dueDate,
        additional_information: raw.additional.trim() || undefined
      }
    }
    return row
  })
}
