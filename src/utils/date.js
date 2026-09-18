export function daysAgo(days, referenceDate = new Date()) {
  const date = new Date(referenceDate)
  date.setDate(date.getDate() - days)
  return date
}

export function daysAgoISO(days, referenceDate = new Date()) {
  return daysAgo(days, referenceDate).toISOString()
}

export function formatDate(dateInput, options = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(dateInput))
}

export function formatRelativeTime(dateInput, now = new Date()) {
  const date = new Date(dateInput)
  const diffMs = now - date
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`

  const diffWeek = Math.round(diffDay / 7)
  if (diffWeek < 5) return `${diffWeek}w ago`

  return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' })
}
