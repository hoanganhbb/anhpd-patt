import {
  clearToken,
  getBaseUrl,
  maskToken,
  readToken,
  tokenFilePath,
  writeToken
} from '@/lib/tokenStore'

const snapshot = async (reveal = false) => {
  const token = await readToken()
  return {
    hasToken: Boolean(token),
    token: reveal ? token : maskToken(token),
    baseUrl: getBaseUrl(),
    tokenFile: tokenFilePath
  }
}

export async function GET(req: Request) {
  const reveal = new URL(req.url).searchParams.get('reveal') === '1'
  return Response.json(await snapshot(reveal))
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string }
  if (!body.token?.trim()) {
    return Response.json({ message: 'API-KEY không được để trống' }, { status: 400 })
  }
  await writeToken(body.token)
  return Response.json(await snapshot())
}

export async function DELETE() {
  await clearToken()
  return Response.json(await snapshot())
}
