import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let dir: string
let store: typeof import('@/lib/tokenStore')

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'token-store-'))
  vi.stubEnv('DATA_DIR', dir)
  vi.stubEnv('MANTIS_BASE_URL', '')
  store = await import('@/lib/tokenStore')
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

describe('tokenStore', () => {
  it('returns empty when token.txt does not exist', async () => {
    expect(await store.readToken()).toBe('')
  })

  it('writes and reads token.txt', async () => {
    await store.writeToken('  abc123secret  ')
    expect(await store.readToken()).toBe('abc123secret')
    expect(await readFile(path.join(dir, 'token.txt'), 'utf8')).toBe('abc123secret\n')
  })

  it('reads base URL from MANTIS_BASE_URL without trailing slash', () => {
    vi.stubEnv('MANTIS_BASE_URL', 'https://mantis.example.com/')
    expect(store.getBaseUrl()).toBe('https://mantis.example.com')
  })

  it('clears the token', async () => {
    await store.clearToken()
    expect(await store.readToken()).toBe('')
  })

  it('masks tokens', () => {
    expect(store.maskToken('abcdefghijkl')).toBe('abcd…ijkl')
    expect(store.maskToken('short')).toBe('*****')
  })
})
