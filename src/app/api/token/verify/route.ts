import { createMantisClient, MissingConfigError } from '@/lib/mantisClient'

// Checks the stored token by asking Mantis who the current user is.
export async function POST() {
  try {
    const client = await createMantisClient()
    const res = await client.get<ArrayBuffer>('api/rest/users/me')
    console.log(res)
    const text = Buffer.from(res.data).toString('utf8')
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {}
    return Response.json({ ok: res.status === 200, status: res.status, data })
  } catch (err) {
    const status = err instanceof MissingConfigError ? 428 : 502
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, status, message }, { status })
  }
}
