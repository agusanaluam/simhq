export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const part = d.split('T')[0]
  const [y, m, day] = part.split('-').map(Number)
  if (!y || !m || !day) return '—'
  return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatIDR(n: number): string {
  return n.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
}

// Strips formatting to raw integer. Negative values and decimal separators are not supported.
export function parseCurrency(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0
}
