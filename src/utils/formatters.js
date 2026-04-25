import { format, isToday, formatDistanceToNow } from 'date-fns'

// ─── Currency ─────────────────────────────────────────────────
export const formatCurrency = (amount) =>
  `₹${Number(amount).toFixed(2)}`

export const formatCurrencyShort = (amount) =>
  `₹${Number(amount).toFixed(0)}`

// ─── Order Time ───────────────────────────────────────────────
export const formatOrderTime = (timestamp) =>
  isToday(new Date(timestamp))
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : format(new Date(timestamp), 'dd MMM yyyy, hh:mm a')

// ─── Order Status Label ───────────────────────────────────────
export const STATUS_LABELS = {
  pending:   'Pending',
  paid:      'Paid',
  ready:     'Ready for Pickup',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

export const formatStatus = (status) => STATUS_LABELS[status] ?? status

// ─── Stock Warning ────────────────────────────────────────────
export const LOW_STOCK_THRESHOLD = 5

export const getStockLabel = (qty) => {
  if (qty === 0) return 'Out of Stock'
  if (qty <= LOW_STOCK_THRESHOLD) return `Only ${qty} left`
  return null
}
