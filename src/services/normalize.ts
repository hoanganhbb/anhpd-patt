// The custom permission/* endpoints return loosely-shaped user lists; pull out {id, name}.
export interface UserOption {
  id: number
  name: string
  label: string
}

const findArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      const found = findArray(value)
      if (found.length) return found
    }
  }
  return []
}

export const toUserOptions = (data: unknown): UserOption[] =>
  findArray(data).flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const u = item as Record<string, unknown>
    const id = Number(u.id ?? u.user_id ?? u.handler_id)
    const name = String(u.username ?? u.name ?? u.user_name ?? '')
    if (!id || !name) return []
    const realName = String(u.realname ?? u.real_name ?? u.full_name ?? '')
    return [{ id, name, label: realName ? `${realName} (${name})` : name }]
  })
