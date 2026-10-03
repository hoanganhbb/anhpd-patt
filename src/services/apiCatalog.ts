import type { RequestServices } from './requestServices'

// Every method of RequestServices with sample params, used by the /api-test page.
// kind: read = safe, write = changes data, danger = deletes data / notifies other people.
export type ApiKind = 'read' | 'write' | 'danger'

export interface ApiEntry {
  name: keyof RequestServices
  kind: ApiKind
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  sample: unknown
}

export const API_CATALOG: ApiEntry[] = [
  { name: 'getProjectList', kind: 'read', method: 'GET', path: 'api/rest/projects', sample: null },
  { name: 'getCurrentUser', kind: 'read', method: 'GET', path: 'api/rest/users/me', sample: null },
  {
    name: 'getListRequest',
    kind: 'read',
    method: 'GET',
    path: 'api/rest/issues?{query}',
    sample: { page_size: 10, page: 1 }
  },
  {
    name: 'getListRequestForReport',
    kind: 'read',
    method: 'GET',
    path: 'api/rest/issues?{query}',
    sample: { page_size: 3000, page: 1 }
  },
  {
    name: 'getListRequestByType',
    kind: 'read',
    method: 'GET',
    path: '/mobile_list_request_by_type.php?{query}',
    sample: { type: 1, page: 1 }
  },
  {
    name: 'getListRequestByTypeCenIT',
    kind: 'read',
    method: 'GET',
    path: '/mobile_list_request_by_type_cenit.php?{query}',
    sample: { type: 1, page: 1 }
  },
  {
    name: 'getListRequestDueDate',
    kind: 'read',
    method: 'GET',
    path: '/mobile_list_request_duedate.php?{query}',
    sample: { page: 1 }
  },
  { name: 'getDetailIssue', kind: 'read', method: 'GET', path: 'api/rest/issues/{id}', sample: 1 },
  {
    name: 'getListDetailIssueFiles',
    kind: 'read',
    method: 'GET',
    path: 'api/rest/issues/{id}/files',
    sample: 1
  },
  {
    name: 'getDetailIssueFiles',
    kind: 'read',
    method: 'GET',
    path: 'api/rest/issues/{idRequest}/files/{idFile}',
    sample: { idRequest: 1, idFile: 1 }
  },
  {
    name: 'getPermissionRequest',
    kind: 'read',
    method: 'GET',
    path: 'api/rest/permission/{id}',
    sample: 1
  },
  {
    name: 'getLstHandlerRequest',
    kind: 'read',
    method: 'POST',
    path: 'api/rest/permission/issue_handler/{id}',
    sample: 1
  },
  {
    name: 'getLstManageProject',
    kind: 'read',
    method: 'POST',
    path: 'api/rest/permission/project_handler/{idProject}',
    sample: 1
  },
  {
    name: 'getLstHandlerProject',
    kind: 'read',
    method: 'POST',
    path: 'api/rest/permission/project_handlers/{idProject}',
    sample: 1
  },
  {
    name: 'getFilter',
    kind: 'read',
    method: 'POST',
    path: 'api/rest/filters/filter_mobile/{id}',
    sample: 1
  },
  {
    name: 'getUserHandlerRequest',
    kind: 'read',
    method: 'POST',
    path: 'api/rest/permission/getExpoToken/{id}',
    sample: 1
  },
  {
    name: 'postNewRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/issues',
    sample: {
      summary: '[TEST] Phiếu kiểm thử API',
      description: 'Tạo tự động từ trang kiểm thử API',
      project: { id: 1 },
      category: { name: 'General' }
    }
  },
  {
    name: 'updateRequest',
    kind: 'write',
    method: 'PATCH',
    path: 'api/rest/issues/{id}',
    sample: { id: 1, data: { summary: '[TEST] Đã sửa' } }
  },
  {
    name: 'updateReportRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/issues/{id}',
    sample: { id: 1, handler: { handler: { id: 1 } } }
  },
  {
    name: 'addNoteRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/issues/{id}/notes',
    sample: { id: 1, data: { text: 'Ghi chú kiểm thử', view_state: { name: 'public' } } }
  },
  {
    name: 'addFilesRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/issues/{id}/files',
    sample: { id: 1, files: [{ name: 'test.txt', content: 'SGVsbG8=' }] }
  },
  {
    name: 'addMonitorRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/permission/monitor/add/{id}',
    sample: 1
  },
  {
    name: 'deleteMonitorRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/permission/monitor/delete/{id}',
    sample: 1
  },
  {
    name: 'resolveRequest',
    kind: 'write',
    method: 'PATCH',
    path: 'api/rest/issues/{id}',
    sample: 1
  },
  {
    name: 'toggleStickRequest',
    kind: 'write',
    method: 'POST',
    path: 'api/rest/permission/sticky',
    sample: { id: 1, sticky: true }
  },
  {
    name: 'addRemindRequest',
    kind: 'danger',
    method: 'POST',
    path: 'api/rest/permission/remind_issue',
    sample: { id: 1, note: 'Nhắc việc' }
  },
  {
    name: 'deleteRequest',
    kind: 'danger',
    method: 'DELETE',
    path: 'api/rest/issues/{id}',
    sample: 1
  },
  {
    name: 'deleteUserNotification',
    kind: 'danger',
    method: 'POST',
    path: 'api/rest/permission/deleteExpoToken',
    sample: { token: 'ExponentPushToken[xxx]' }
  }
]

export const callApi = (service: RequestServices, name: ApiEntry['name'], params: unknown) => {
  const fn = service[name] as (arg: unknown) => Promise<unknown>
  return fn(params)
}
