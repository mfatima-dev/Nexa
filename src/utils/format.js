export function formatCurrency(value, { decimals = 0 } = {}) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** Signed unit change for stock movements: +60, −2 (true minus sign), 0. */
export function formatSignedChange(change) {
  if (change > 0) return `+${change}`
  if (change < 0) return `−${Math.abs(change)}`
  return '0'
}

/**
 * Compact currency for chart axes: $400, $1.2k, $2.5k, $10k, $1.2M. One decimal is kept so a $1,200
 * gridline never reads as "$1k".
 */
export function formatCompactCurrency(value) {
  if (!Number.isFinite(value)) return ''
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  if (Math.round(abs) < 1000) return `${sign}$${Math.round(abs)}`
  const thousands = Number((abs / 1000).toFixed(1))
  if (thousands < 1000) return `${sign}$${thousands}k`
  return `${sign}$${Number((abs / 1000000).toFixed(1))}M`
}
