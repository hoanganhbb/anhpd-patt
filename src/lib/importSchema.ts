import { normalize } from './text'

// Layout of the import workbook. One sheet: the input table on the left (A–I) and the lookup
// lists it draws its dropdowns from on the right (L onwards), so users never leave the sheet.
export const SHEET_NAME = 'Import công việc'
export const MAX_ROWS = 500

export type ColumnKey =
  | 'stt'
  | 'project'
  | 'category'
  | 'summary'
  | 'description'
  | 'priority'
  | 'handler'
  | 'dueDate'
  | 'additional'

export interface ColumnDef {
  key: ColumnKey
  header: string
  required?: boolean
  width: number
  hint: string
}

export const COLUMNS: ColumnDef[] = [
  { key: 'stt', header: 'STT', width: 7, hint: 'Số thứ tự (không bắt buộc)' },
  {
    key: 'project',
    header: 'Dự án',
    required: true,
    width: 36,
    hint: 'Chọn từ danh sách thả xuống'
  },
  {
    key: 'category',
    header: 'Danh mục',
    width: 26,
    hint: 'Chọn theo dự án. Để trống = "Tùy biến chức năng"'
  },
  {
    key: 'summary',
    header: 'Tiêu đề',
    required: true,
    width: 44,
    hint: 'Tối đa 128 ký tự'
  },
  {
    key: 'description',
    header: 'Mô tả',
    width: 54,
    hint: 'Để trống = dùng tiêu đề làm mô tả'
  },
  { key: 'priority', header: 'Ưu tiên', width: 16, hint: 'Để trống = Bình thường' },
  { key: 'handler', header: 'Người xử lý', width: 30, hint: 'Để trống = chưa giao' },
  { key: 'dueDate', header: 'Hạn xử lý', width: 15, hint: 'Định dạng dd/mm/yyyy' },
  { key: 'additional', header: 'Thông tin bổ sung', width: 34, hint: 'Ghi chú thêm (nếu có)' }
]

export const columnLabel = (col: ColumnDef) => (col.required ? `${col.header} (*)` : col.header)

// Header cells are matched by name, so users can reorder or insert columns.
const HEADER_LOOKUP = new Map(COLUMNS.map(c => [normalize(c.header), c.key]))
export const headerKey = (text: string): ColumnKey | undefined =>
  HEADER_LOOKUP.get(normalize(text.replace(/\(\*\)|\*/g, '')))

// Row positions.
export const ROW_TITLE = 1
export const ROW_SUBTITLE = 2
export const ROW_GUIDE_FIRST = 3
export const ROW_LOOKUP_TITLE = 6
export const ROW_HEADER = 7
export const ROW_SAMPLE_FIRST = 8
export const SAMPLE_COUNT = 2
export const ROW_DATA_FIRST = ROW_SAMPLE_FIRST + SAMPLE_COUNT
export const ROW_DATA_LAST = ROW_DATA_FIRST + MAX_ROWS - 1
// First row of every lookup list.
export const ROW_LOOKUP_FIRST = ROW_HEADER + 1

// Lookup lists: column letters (1-based numbers).
export const LOOKUP = {
  projectId: 12, // L
  projectPath: 13, // M
  pairProject: 15, // O
  pairCategory: 16, // P
  priority: 18, // R
  handler: 20, // T
  handlerUser: 21 // U
} as const

// Rows marked as examples in the STT column are skipped on import.
export const SAMPLE_MARK = 'VD'
export const isSampleMark = (value: string) => /^vd\d*$/.test(normalize(value))
