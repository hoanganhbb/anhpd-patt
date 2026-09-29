// Search without Vietnamese accents: "ke toan" matches "Kế toán", "tuy bien" matches "Tuỳ biến".
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

export const matchesText = (haystack: string, query: string) =>
  normalize(haystack).includes(normalize(query))
