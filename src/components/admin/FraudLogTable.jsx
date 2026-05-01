import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

// ─── Constants ───────────────────────────────────────────────
const PAGE_SIZE = 20

const REASON_BADGE = {
  duplicate_scan: 'bg-red-100 text-red-700 border-red-200',
  invalid_qr:     'bg-orange-100 text-orange-700 border-orange-200',
  expired_order:  'bg-amber-100 text-amber-700 border-amber-200',
}

const REASON_LABEL = {
  duplicate_scan: 'Duplicate Scan',
  invalid_qr:     'Invalid QR',
  expired_order:  'Expired Order',
}

// ─── Sub-components ──────────────────────────────────────────
function ReasonBadge({ reason }) {
  const cls   = REASON_BADGE[reason] || 'bg-gray-100 text-gray-700 border-gray-200'
  const label = REASON_LABEL[reason] || reason.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function FraudLogTable({ logs }) {
  const [page, setPage] = useState(0)

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100 flex flex-col items-center">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No fraud events recorded</h3>
        <p className="text-gray-500 text-sm">The fraud detection system hasn't recorded any suspicious activity.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(logs.length / PAGE_SIZE)
  const pageSlice  = logs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="px-6 py-4 font-bold">Time</th>
              <th className="px-6 py-4 font-bold">Reason</th>
              <th className="px-6 py-4 font-bold">Staff</th>
              <th className="px-6 py-4 font-bold">Order ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageSlice.map((log, idx) => (
              <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatDistanceToNow(new Date(log.detected_at), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ReasonBadge reason={log.reason} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {log.profiles?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {log.order_id ? log.order_id.slice(0, 8).toUpperCase() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, logs.length)} of {logs.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
