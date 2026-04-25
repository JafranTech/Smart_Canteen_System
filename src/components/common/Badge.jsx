import clsx from 'clsx'

// Status → Tailwind color mapping from ui-design.md
const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  ready:     'bg-purple-100 text-purple-700',
  collected: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function Badge({ label, variant, className = '' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        STATUS_COLORS[variant] ?? 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {label}
    </span>
  )
}
