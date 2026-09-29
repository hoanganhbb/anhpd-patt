import ExcelJS from 'exceljs'

import { PRIORITIES, type Project } from '@/services/types'
import type { UserOption } from '@/services/normalize'

import {
  COLUMNS,
  LOOKUP,
  MAX_ROWS,
  ROW_DATA_FIRST,
  ROW_DATA_LAST,
  ROW_GUIDE_FIRST,
  ROW_HEADER,
  ROW_LOOKUP_FIRST,
  ROW_LOOKUP_TITLE,
  ROW_SAMPLE_FIRST,
  ROW_SUBTITLE,
  ROW_TITLE,
  SAMPLE_MARK,
  SHEET_NAME,
  columnLabel,
  type ColumnKey
} from './importSchema'
import { flattenProjects, findProjectById } from './projects'

const BRAND = 'FF5B5BD6'
const BRAND_DARK = 'FF4040B0'
const BRAND_SOFT = 'FF7C7CD9'
const BRAND_TINT = 'FFEDEDFB'
const TEAL = 'FF0E8F8E'
const TEAL_TINT = 'FFE3F5F4'
const INK = 'FF1C2033'
const MUTED = 'FF646A85'
const LINE = 'FFD9DCEA'
const ZEBRA = 'FFF7F8FC'
const SAMPLE_FILL = 'FFFFF8E1'
const FONT = 'Segoe UI'

const solid = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb }
})
const border = (argb = LINE): Partial<ExcelJS.Borders> => {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb } }
  return { top: side, left: side, bottom: side, right: side }
}

export interface TemplateInput {
  projects: Project[]
  handlers: UserOption[]
  // Name of the project the handler list was taken from (shown above the list).
  handlerSource?: string
  generatedBy?: string
  now?: Date
}

const colIndex = (key: ColumnKey) => COLUMNS.findIndex(c => c.key === key) + 1
const letter = (n: number) => {
  let s = ''
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26))
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s
  return s
}
const range = (col: number, from: number, to: number) =>
  `$${letter(col)}$${from}:$${letter(col)}$${to}`

// "Cha / Con" -> categories of the leaf project, one (project, category) pair per row.
const categoryPairs = (projects: Project[]) =>
  flattenProjects(projects).flatMap(o =>
    [...new Set((findProjectById(projects, o.id)?.categories ?? []).map(c => c.name))].map(
      category => ({ project: o.path, category })
    )
  )

export async function buildTemplate(input: TemplateInput): Promise<ArrayBuffer> {
  const { projects, handlers, handlerSource, generatedBy, now = new Date() } = input
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Phiếu công việc'
  wb.created = now
  const ws = wb.addWorksheet(SHEET_NAME, {
    properties: { tabColor: { argb: BRAND } },
    views: [
      { state: 'frozen', ySplit: ROW_HEADER, xSplit: 0, showGridLines: false, zoomScale: 100 }
    ]
  })

  const lastCol = COLUMNS.length
  const projectList = flattenProjects(projects)
  const pairs = categoryPairs(projects)
  const priorityRows = PRIORITIES.length
  const lookupLast = (count: number) => ROW_LOOKUP_FIRST + Math.max(count, 1) - 1

  // ---- Column widths (input table, spacer, lookup lists) ----
  COLUMNS.forEach((c, i) => (ws.getColumn(i + 1).width = c.width))
  ws.getColumn(lastCol + 1).width = 3
  ws.getColumn(lastCol + 2).width = 3
  ws.getColumn(LOOKUP.projectId).width = 9
  ws.getColumn(LOOKUP.projectPath).width = 44
  ws.getColumn(LOOKUP.projectPath + 1).width = 3
  ws.getColumn(LOOKUP.pairProject).width = 44
  ws.getColumn(LOOKUP.pairCategory).width = 32
  ws.getColumn(LOOKUP.pairCategory + 1).width = 3
  ws.getColumn(LOOKUP.priority).width = 18
  ws.getColumn(LOOKUP.priority + 1).width = 3
  ws.getColumn(LOOKUP.handler).width = 38
  ws.getColumn(LOOKUP.handlerUser).width = 22

  // ---- Banner ----
  ws.mergeCells(ROW_TITLE, 1, ROW_TITLE, lastCol)
  const title = ws.getCell(ROW_TITLE, 1)
  title.value = 'PHIẾU CÔNG VIỆC  ·  BIỂU MẪU NHẬP HÀNG LOẠT'
  title.font = { name: FONT, size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
  title.fill = solid(BRAND)
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(ROW_TITLE).height = 40

  ws.mergeCells(ROW_SUBTITLE, 1, ROW_SUBTITLE, lastCol)
  const sub = ws.getCell(ROW_SUBTITLE, 1)
  const stamp = now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  sub.value = `Tạo lúc ${stamp}${generatedBy ? ` bởi ${generatedBy}` : ''}  ·  Tối đa ${MAX_ROWS} công việc mỗi lần nhập`
  sub.font = { name: FONT, size: 10, italic: true, color: { argb: 'FFE4E4FA' } }
  sub.fill = solid(BRAND_DARK)
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(ROW_SUBTITLE).height = 22

  // ---- Guide ----
  const guide = [
    `①  Mỗi công việc một dòng, bắt đầu từ dòng ${ROW_DATA_FIRST}. Cột có dấu (*) là bắt buộc: Dự án, Tiêu đề.`,
    `②  Dự án, Danh mục, Ưu tiên, Người xử lý chọn từ danh sách thả xuống — lấy dữ liệu từ bảng "Danh mục tham chiếu" bên phải (cột ${letter(LOOKUP.projectId)}–${letter(LOOKUP.handlerUser)}). Danh mục phụ thuộc vào Dự án đã chọn.`,
    `③  Hạn xử lý nhập dd/mm/yyyy. Dòng mẫu (STT = ${SAMPLE_MARK}) sẽ được bỏ qua khi nhập. Không đổi tên/xoá dòng tiêu đề bảng.`
  ]
  guide.forEach((text, i) => {
    const r = ROW_GUIDE_FIRST + i
    ws.mergeCells(r, 1, r, lastCol)
    const cell = ws.getCell(r, 1)
    cell.value = text
    cell.font = { name: FONT, size: 10, color: { argb: INK } }
    cell.fill = solid(BRAND_TINT)
    cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
    ws.getRow(r).height = i === 1 ? 32 : 22
  })

  // ---- Input table header ----
  COLUMNS.forEach((c, i) => {
    const cell = ws.getCell(ROW_HEADER, i + 1)
    cell.value = columnLabel(c)
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = solid(c.required ? BRAND_DARK : BRAND_SOFT)
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border('FFFFFFFF')
    cell.note = {
      texts: [{ text: c.hint, font: { name: FONT, size: 10 } }],
      margins: { insetmode: 'auto', inset: [0.1, 0.1, 0.1, 0.1] }
    }
  })
  ws.getRow(ROW_HEADER).height = 32

  // ---- Data rows: style, banding, validation ----
  const col = (key: ColumnKey) => colIndex(key)
  const projectRange = range(LOOKUP.projectPath, ROW_LOOKUP_FIRST, lookupLast(projectList.length))
  const pairProjectRange = range(LOOKUP.pairProject, ROW_LOOKUP_FIRST, lookupLast(pairs.length))
  const pairCategoryFirst = `$${letter(LOOKUP.pairCategory)}$${ROW_LOOKUP_FIRST}`
  const priorityRange = range(
    LOOKUP.priority,
    ROW_LOOKUP_FIRST,
    ROW_LOOKUP_FIRST + priorityRows - 1
  )
  const handlerRange = range(LOOKUP.handler, ROW_LOOKUP_FIRST, lookupLast(handlers.length + 1))

  const errorMessage = (text: string) => ({
    showErrorMessage: true,
    errorStyle: 'stop' as const,
    errorTitle: 'Giá trị không hợp lệ',
    error: text
  })

  for (let r = ROW_SAMPLE_FIRST; r <= ROW_DATA_LAST; r++) {
    const isSample = r < ROW_DATA_FIRST
    const fill = isSample ? SAMPLE_FILL : (r - ROW_DATA_FIRST) % 2 === 1 ? ZEBRA : 'FFFFFFFF'
    COLUMNS.forEach((c, i) => {
      const cell = ws.getCell(r, i + 1)
      cell.fill = solid(fill)
      cell.border = border()
      cell.font = {
        name: FONT,
        size: 10.5,
        italic: isSample,
        color: { argb: isSample ? MUTED : INK }
      }
      cell.alignment = {
        vertical: 'top',
        wrapText: c.key === 'description' || c.key === 'additional' || c.key === 'summary',
        horizontal:
          c.key === 'stt' || c.key === 'dueDate' || c.key === 'priority' ? 'center' : 'left'
      }
    })
    ws.getCell(r, col('dueDate')).numFmt = 'dd/mm/yyyy'
    ws.getCell(r, col('stt')).font = {
      name: FONT,
      size: 10,
      bold: isSample,
      color: { argb: MUTED }
    }
    if (!isSample) ws.getCell(r, col('stt')).value = r - ROW_DATA_FIRST + 1
    ws.getRow(r).height = 24

    ws.getCell(r, col('project')).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [projectRange],
      showInputMessage: true,
      promptTitle: 'Dự án (*)',
      prompt: 'Chọn dự án từ danh sách.',
      ...errorMessage('Hãy chọn dự án có trong danh sách (bảng Danh mục tham chiếu).')
    }
    const projCell = `$${letter(col('project'))}${r}`
    ws.getCell(r, col('category')).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [
        `OFFSET(${pairCategoryFirst},MATCH(${projCell},${pairProjectRange},0)-1,0,COUNTIF(${pairProjectRange},${projCell}),1)`
      ],
      showInputMessage: true,
      promptTitle: 'Danh mục',
      prompt: 'Chọn Dự án trước, danh sách danh mục sẽ hiện theo dự án.',
      ...errorMessage('Hãy chọn Dự án trước rồi chọn danh mục thuộc dự án đó.')
    }
    ws.getCell(r, col('summary')).dataValidation = {
      type: 'textLength',
      operator: 'lessThanOrEqual',
      allowBlank: true,
      formulae: [128],
      ...errorMessage('Tiêu đề tối đa 128 ký tự.')
    }
    ws.getCell(r, col('priority')).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [priorityRange],
      ...errorMessage('Hãy chọn mức ưu tiên trong danh sách.')
    }
    ws.getCell(r, col('handler')).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [handlerRange],
      showInputMessage: true,
      promptTitle: 'Người xử lý',
      prompt: 'Chọn từ danh sách, hoặc nhập tên đăng nhập. Để trống = chưa giao.',
      errorStyle: 'warning',
      showErrorMessage: true,
      errorTitle: 'Người xử lý ngoài danh sách',
      error: 'Giá trị không có trong danh sách. Vẫn tiếp tục? (Hệ thống sẽ kiểm tra lại khi nhập.)'
    }
    ws.getCell(r, col('dueDate')).dataValidation = {
      type: 'date',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [new Date(Date.UTC(2000, 0, 1))],
      showInputMessage: true,
      promptTitle: 'Hạn xử lý',
      prompt: 'Nhập ngày theo dạng dd/mm/yyyy.',
      ...errorMessage('Hãy nhập ngày hợp lệ, ví dụ 30/09/2026.')
    }
  }

  // ---- Sample rows ----
  const firstProject = projectList[0]
  const firstCategory = pairs.find(p => p.project === firstProject?.path)?.category
  const samples: Partial<Record<ColumnKey, ExcelJS.CellValue>>[] = [
    {
      stt: SAMPLE_MARK,
      project: firstProject?.path ?? '(chọn dự án)',
      category: firstCategory ?? '',
      summary: 'Lỗi không đăng nhập được trên ứng dụng di động',
      description:
        'Mở app → nhập đúng tài khoản → báo "Lỗi kết nối". Mong muốn: đăng nhập bình thường.',
      priority: 'Cao',
      handler: handlers[0]?.label ?? '',
      dueDate: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 7)),
      additional: 'Xảy ra trên Android 14'
    },
    {
      stt: SAMPLE_MARK,
      project: firstProject?.path ?? '(chọn dự án)',
      category: firstCategory ?? '',
      summary: 'Bổ sung cột "Ngày tạo" vào báo cáo tuần',
      description: '',
      priority: 'Bình thường',
      handler: '',
      dueDate: undefined,
      additional: ''
    }
  ]
  samples.forEach((sample, i) => {
    for (const c of COLUMNS) {
      const v = sample[c.key]
      if (v !== undefined && v !== '') ws.getCell(ROW_SAMPLE_FIRST + i, colIndex(c.key)).value = v
    }
  })

  // ---- Lookup lists (same sheet, to the right) ----
  ws.mergeCells(ROW_LOOKUP_TITLE, LOOKUP.projectId, ROW_LOOKUP_TITLE, LOOKUP.handlerUser)
  const lookupTitle = ws.getCell(ROW_LOOKUP_TITLE, LOOKUP.projectId)
  lookupTitle.value = 'DANH MỤC THAM CHIẾU  ·  chỉ để tra cứu, cột A–I mới là dữ liệu nhập'
  lookupTitle.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  lookupTitle.fill = solid(TEAL)
  lookupTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(ROW_LOOKUP_TITLE).height = 24

  const lookupHeader = (c: number, text: string) => {
    const cell = ws.getCell(ROW_HEADER, c)
    cell.value = text
    cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = solid(TEAL)
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = border('FFFFFFFF')
  }
  const lookupCell = (r: number, c: number, value: ExcelJS.CellValue, zebra: boolean) => {
    const cell = ws.getCell(r, c)
    cell.value = value
    cell.font = { name: FONT, size: 10, color: { argb: INK } }
    cell.fill = solid(zebra ? TEAL_TINT : 'FFFFFFFF')
    cell.border = border()
    cell.alignment = { vertical: 'middle' }
  }

  lookupHeader(LOOKUP.projectId, 'Mã')
  lookupHeader(LOOKUP.projectPath, 'Dự án (cột B)')
  lookupHeader(LOOKUP.pairProject, 'Dự án')
  lookupHeader(LOOKUP.pairCategory, 'Danh mục thuộc dự án')
  lookupHeader(LOOKUP.priority, 'Mức ưu tiên')
  lookupHeader(LOOKUP.handler, handlerSource ? `Người xử lý — ${handlerSource}` : 'Người xử lý')
  lookupHeader(LOOKUP.handlerUser, 'Tên đăng nhập')

  projectList.forEach((p, i) => {
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.projectId, Number(p.id), i % 2 === 1)
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.projectPath, p.path, i % 2 === 1)
  })
  pairs.forEach((p, i) => {
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.pairProject, p.project, i % 2 === 1)
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.pairCategory, p.category, i % 2 === 1)
  })
  PRIORITIES.forEach((p, i) =>
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.priority, p.label, i % 2 === 1)
  )
  // The dropdown range keeps one extra row so that users can add a name by hand.
  handlers.forEach((h, i) => {
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.handler, h.label, i % 2 === 1)
    lookupCell(ROW_LOOKUP_FIRST + i, LOOKUP.handlerUser, h.name, i % 2 === 1)
  })

  ws.autoFilter = {
    from: { row: ROW_HEADER, column: 1 },
    to: { row: ROW_DATA_LAST, column: lastCol }
  }
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printArea: `A1:${letter(lastCol)}${ROW_DATA_LAST}`,
    printTitlesRow: `${ROW_HEADER}:${ROW_HEADER}`
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

export const TEMPLATE_FILE_NAME = 'mau-nhap-cong-viec.xlsx'
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
