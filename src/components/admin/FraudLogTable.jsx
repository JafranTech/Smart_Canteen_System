import { format } from 'date-fns'

export default function FraudLogTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100 flex flex-col items-center">
        <div className="text-4xl mb-4">🛡️</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Security Alerts</h3>
        <p className="text-gray-500 text-sm">The fraud detection system hasn't recorded any suspicious activity.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="px-6 py-4 font-bold">Detected At</th>
              <th className="px-6 py-4 font-bold">Reason</th>
              <th className="px-6 py-4 font-bold">Order ID</th>
              <th className="px-6 py-4 font-bold">Scanned By</th>
              <th className="px-6 py-4 font-bold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {format(new Date(log.detected_at), 'dd MMM yyyy, HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-[#FB3640] border border-red-200">
                    {log.reason.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {log.order_id ? log.order_id.split('-')[0].toUpperCase() : 'INVALID'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {log.profiles?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs" title={log.notes}>
                  {log.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
