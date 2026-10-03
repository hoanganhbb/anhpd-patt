import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type RawAxiosRequestHeaders
} from 'axios'

// All calls go through the Next.js proxy, which attaches the API-KEY from data/token.txt.
export const PROXY_PREFIX = '/api/proxy/'

const stripLeadingSlash = (url: string) => url.replace(/^\/+/, '')

export class HttpService {
  constructor(private readonly client: AxiosInstance) {}

  get = <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    this.client.get<T>(stripLeadingSlash(url), config).then(res => res.data)

  post = <T = unknown>(url: string, data?: unknown, headers?: RawAxiosRequestHeaders) =>
    this.client.post<T>(stripLeadingSlash(url), data, { headers }).then(res => res.data)

  patch = <T = unknown>(url: string, data?: unknown, headers?: RawAxiosRequestHeaders) =>
    this.client.patch<T>(stripLeadingSlash(url), data, { headers }).then(res => res.data)

  delete = <T = unknown>(url: string, data?: unknown) =>
    this.client.delete<T>(stripLeadingSlash(url), { data }).then(res => res.data)
}

export const apiClient = axios.create({
  baseURL: PROXY_PREFIX,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Turn axios errors into readable messages for the UI.
export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | string | undefined
    const detail = typeof data === 'string' ? data : data?.message
    return `${err.response?.status ?? ''} ${detail ?? err.message}`.trim()
  }
  return err instanceof Error ? err.message : String(err)
}

const DataService = new HttpService(apiClient)
export default DataService
