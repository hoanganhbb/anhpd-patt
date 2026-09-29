import queryString from 'query-string'

import DataService, { type HttpService } from './httpService'
import type { CurrentUser, Issue, IssueListResponse, Project } from './types'

type Params = Record<string, string | number | boolean | undefined | null>

export class RequestServices {
  constructor(private readonly http: HttpService) {}

  getListRequest = (params: Params) => {
    const query = queryString.stringify(params)
    return this.http.get<IssueListResponse>(`api/rest/issues?${query}`)
  }

  getListRequestByType = (params: Params) => {
    const query = queryString.stringify(params)
    return this.http.get(`/mobile_list_request_by_type.php?${query}`)
  }

  getListRequestByTypeCenIT = (params: Params) => {
    const query = queryString.stringify(params)
    return this.http.get(`/mobile_list_request_by_type_cenit.php?${query}`)
  }

  getListRequestDueDate = (params: Params) => {
    const query = queryString.stringify(params)
    return this.http.get(`/mobile_list_request_duedate.php?${query}`)
  }

  getDetailIssue = (idRequest: number | string) =>
    this.http.get<{ issues: Issue[] }>(`api/rest/issues/${idRequest}`)

  getListDetailIssueFiles = (idRequest: number | string) =>
    this.http.get(`api/rest/issues/${idRequest}/files`)

  getDetailIssueFiles = (params: { idRequest: number | string; idFile: number | string }) =>
    this.http.get(`api/rest/issues/${params.idRequest}/files/${params.idFile}`)

  getPermissionRequest = (idRequest: number | string) =>
    this.http.get(`api/rest/permission/${idRequest}`)

  getProjectList = () => this.http.get<{ projects: Project[] }>('api/rest/projects')

  getCurrentUser = () => this.http.get<CurrentUser>('api/rest/users/me')

  // Mark an issue as resolved (status 80) with resolution "fixed" (20).
  resolveRequest = (id: number | string) =>
    this.updateRequest({ id, data: { status: { id: 80 }, resolution: { id: 20 } } })

  postNewRequest = (params: unknown) => this.http.post<{ issue: Issue }>('api/rest/issues', params)

  addMonitorRequest = (idRequest: number | string) =>
    this.http.post(`api/rest/permission/monitor/add/${idRequest}`, {})

  deleteMonitorRequest = (idRequest: number | string) =>
    this.http.post(`api/rest/permission/monitor/delete/${idRequest}`, {})

  toggleStickRequest = (params: unknown) => this.http.post('api/rest/permission/sticky', params)

  getLstHandlerRequest = (idRequest: number | string) =>
    this.http.post(`api/rest/permission/issue_handler/${idRequest}`, {})

  updateRequest = (params: { id: number | string; data: unknown }) =>
    this.http.patch(`api/rest/issues/${params.id}`, params.data, {
      'Content-Type': 'application/json'
    })

  updateReportRequest = (params: { id: number | string; handler: unknown }) =>
    this.http.post(`api/rest/issues/${params.id}`, params.handler, {
      'Content-Type': 'application/json'
    })

  addRemindRequest = (params: unknown) => this.http.post('api/rest/permission/remind_issue', params)

  addNoteRequest = (params: { id: number | string; data: unknown }) =>
    this.http.post(`api/rest/issues/${params.id}/notes`, params.data, {
      'Content-Type': 'application/json'
    })

  deleteRequest = (id: number | string) => this.http.delete(`api/rest/issues/${id}`, {})

  getLstManageProject = (idProject: number | string) =>
    this.http.post(`api/rest/permission/project_handler/${idProject}`, {})

  getUserHandlerRequest = (id: number | string) =>
    this.http.post(`api/rest/permission/getExpoToken/${id}`, {})

  deleteUserNotification = (params: unknown) =>
    this.http.post('api/rest/permission/deleteExpoToken', params)

  getFilter = (id: number | string) => this.http.post(`api/rest/filters/filter_mobile/${id}`, {})

  getLstHandlerProject = (idProject: number | string) =>
    this.http.post(`api/rest/permission/project_handlers/${idProject}`, {})
}

const requestServices = new RequestServices(DataService)
export default requestServices
