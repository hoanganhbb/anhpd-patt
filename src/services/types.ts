// Shapes of the MantisBT REST API responses (only the fields used by the UI).
export interface Ref {
  id: number
  name: string
  label?: string
  real_name?: string
  email?: string
  color?: string
}

export interface Note {
  id: number
  reporter?: Ref
  text: string
  view_state?: Ref
  created_at: string
  updated_at?: string
}

export interface Attachment {
  id: number
  filename: string
  size: number
  content_type?: string
  created_at?: string
  reporter?: Ref
}

// One entry of an issue's change log.
export interface HistoryEntry {
  created_at: string
  user?: Ref
  type?: { id: number; name: string }
  field?: { name: string; label?: string }
  old_value?: Partial<Ref>
  new_value?: Partial<Ref>
  file?: { id: number; filename: string }
  message?: string
  change?: string
}

// What the current user may do on an issue (api/rest/permission/:id).
export type IssuePermission = Partial<
  Record<
    | 'can_update'
    | 'can_assign'
    | 'can_change_status'
    | 'can_monitor'
    | 'can_unmonitor'
    | 'can_sticky'
    | 'can_unsticky'
    | 'can_close'
    | 'can_reopen'
    | 'can_move'
    | 'can_delete'
    | 'can_clone'
    | 'can_remind',
    boolean
  >
>

export interface Issue {
  id: number
  summary: string
  description?: string
  additional_information?: string
  steps_to_reproduce?: string
  project?: Ref
  category?: Ref
  reporter?: Ref
  handler?: Ref
  status?: Ref
  resolution?: Ref
  priority?: Ref
  severity?: Ref
  reproducibility?: Ref
  view_state?: Ref
  due_date?: string
  date_start?: string
  date_end?: string
  sticky?: boolean
  created_at?: string
  updated_at?: string
  notes?: Note[]
  attachments?: Attachment[]
  monitors?: Ref[]
  tags?: Ref[]
  history?: HistoryEntry[]
}

export interface IssueListResponse {
  issues: Issue[]
  total_count?: number
}

export interface CurrentUser {
  id: number
  name: string
  real_name?: string
  email?: string
  access_level?: Ref
}

export interface Project {
  id: number
  name: string
  categories?: Ref[]
  enabled?: boolean
  subProjects?: Project[]
}

// Standard MantisBT status codes.
export const STATUSES = [
  { id: 10, name: 'new', label: 'Mới' },
  { id: 20, name: 'feedback', label: 'Phản hồi' },
  { id: 30, name: 'acknowledged', label: 'Đã tiếp nhận' },
  { id: 40, name: 'confirmed', label: 'Đã xác nhận' },
  { id: 50, name: 'assigned', label: 'Đã giao' },
  { id: 80, name: 'resolved', label: 'Đã xử lý' },
  { id: 90, name: 'closed', label: 'Đã đóng' }
]

export const PRIORITIES = [
  { id: 10, name: 'none', label: 'Không' },
  { id: 20, name: 'low', label: 'Thấp' },
  { id: 30, name: 'normal', label: 'Bình thường' },
  { id: 40, name: 'high', label: 'Cao' },
  { id: 50, name: 'urgent', label: 'Khẩn' },
  { id: 60, name: 'immediate', label: 'Ngay lập tức' }
]
