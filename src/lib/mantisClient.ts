import 'server-only'

import axios from 'axios'

import { getBaseUrl, readToken } from './tokenStore'

export class MissingConfigError extends Error {}

// Axios instance pointing at MANTIS_BASE_URL, authorised with the API-KEY from token.txt.
export const createMantisClient = async () => {
  const baseURL = getBaseUrl()
  const token = await readToken()
  console.log('Base URL:', baseURL)
  console.log('Token:', token)
  if (!baseURL) throw new MissingConfigError('Chưa cấu hình MANTIS_BASE_URL trong .env.local')
  if (!token) throw new MissingConfigError('Chưa cấu hình API-KEY (data/token.txt)')

  return axios.create({
    baseURL: `${baseURL}/`,
    // Long enough for the 3000-issue report request.
    timeout: 180000,
    headers: { Authorization: token },
    responseType: 'arraybuffer',
    validateStatus: () => true
  })
}
