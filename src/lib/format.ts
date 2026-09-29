const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60]
]

// "3 giờ trước", "hôm qua"...
export const timeAgo = (value?: string, now = Date.now()) => {
  if (!value) return ''
  const seconds = (new Date(value).getTime() - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'vừa xong'
}

export const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''

// "2026-09-30" -> "2026-09-30T00:00:00+07:00" in the browser's timezone.
export const toLocalIso = (dateKey: string) => {
  const offset = -new Date(`${dateKey}T00:00:00`).getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const mm = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${dateKey}T00:00:00${sign}${hh}:${mm}`
}
