import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

// The API-KEY is stored as a plain txt file so it can be edited by hand or through /settings.
// The server address comes from the MANTIS_BASE_URL env variable (.env.local).
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const TOKEN_FILE = path.join(DATA_DIR, 'token.txt')

export const readToken = async () => {
  try {
    return (await fs.readFile(TOKEN_FILE, 'utf8')).trim()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw err
  }
}

export const writeToken = async (token: string) => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(TOKEN_FILE, `${token.trim()}\n`, { encoding: 'utf8', mode: 0o600 })
}

export const clearToken = () => fs.rm(TOKEN_FILE, { force: true })

export const getBaseUrl = () => (process.env.MANTIS_BASE_URL ?? '').trim().replace(/\/+$/, '')

export const maskToken = (token: string) =>
  token.length <= 8 ? '*'.repeat(token.length) : `${token.slice(0, 4)}…${token.slice(-4)}`

export const tokenFilePath = TOKEN_FILE
