import type { NextRequest } from 'next/server'

import { createMantisClient, MissingConfigError } from '@/lib/mantisClient'

// Forwards /api/proxy/<path>?<query> to MANTIS_BASE_URL/<path>?<query> with the stored API-KEY,
// so the key never reaches the browser and CORS is not an issue.
const forward = async (req: NextRequest, ctx: RouteContext<'/api/proxy/[...path]'>) => {
  const { path } = await ctx.params
  const url = `${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`

  let client
  try {
    client = await createMantisClient()
  } catch (err) {
    if (err instanceof MissingConfigError) {
      return Response.json({ message: err.message }, { status: 428 })
    }
    throw err
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = hasBody ? await req.arrayBuffer() : undefined

  try {
    const res = await client.request<ArrayBuffer>({
      url,
      method: req.method,
      data: body && body.byteLength ? Buffer.from(body) : undefined,
      headers: {
        'Content-Type': req.headers.get('content-type') ?? 'application/json',
        Accept: req.headers.get('accept') ?? 'application/json'
      }
    })

    const headers = new Headers()
    const contentType = res.headers['content-type']
    if (contentType) headers.set('Content-Type', String(contentType))
    const disposition = res.headers['content-disposition']
    if (disposition) headers.set('Content-Disposition', String(disposition))
    headers.set('X-Upstream-Status', String(res.status))

    // 204/304 must not carry a body.
    const payload = [204, 304].includes(res.status) ? null : res.data
    return new Response(payload, { status: res.status, headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ message: `Không kết nối được máy chủ: ${message}` }, { status: 502 })
  }
}

export const GET = forward
export const POST = forward
export const PATCH = forward
export const PUT = forward
export const DELETE = forward
