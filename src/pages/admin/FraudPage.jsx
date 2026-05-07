import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { AlertOctagon, Loader2, ShieldCheck } from 'lucide-react'
import FraudLogTable from '../../components/admin/FraudLogTable.jsx'
import AdminLayout from '../../components/admin/AdminLayout.jsx'

// ─── Constants ───────────────────────────────────────────────
const FRAUD_LOG_LIMIT = 100

// ─── Sub-components ──────────────────────────────────────────
function StatCard({ title, value, colorClass }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <p className={`text-4xl font-black ${colorClass}`}>{value}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function FraudPage() {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['fraud_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_logs')
        .select('*, orders(id, total_amount), profiles:scanned_by (name)')
        .order('detected_at', { ascending: false })
        .limit(FRAUD_LOG_LIMIT)

      if (error) throw new Error('Unable to load fraud logs.')
      return data
    },
  })

  const totalAlerts    = logs?.length || 0
  const duplicateScans = logs?.filter((l) => l.reason === 'duplicate_scan').length || 0
  const invalidTokens  = logs?.filter((l) => l.reason === 'invalid_qr').length || 0

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center border border-red-200 shadow-sm">
              <AlertOctagon className="w-7 h-7 text-imperial" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Security &amp; Fraud</h1>
              <p className="text-gray-500 font-medium mt-1">Audit trail of suspicious orders and scanner alerts.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <span className="text-sm font-bold text-gray-900">Engine Active</span>
          </div>
        </div>

        {/* Stats strip */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Fraud Attempts" value={totalAlerts}    colorClass="text-gray-900" />
            <StatCard title="Duplicate Scans"       value={duplicateScans} colorClass="text-amber-500" />
            <StatCard title="Invalid QR"             value={invalidTokens}  colorClass="text-imperial" />
          </div>
        )}

        {/* Table */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Alert History</h2>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Loader2 className="w-10 h-10 animate-spin text-imperial" />
              <p className="text-imperial mt-4 font-bold tracking-widest text-sm uppercase animate-pulse">
                Fetching Security Logs...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-medium flex items-center gap-3">
              <AlertOctagon className="w-5 h-5" />
              {error.message}
            </div>
          ) : (
            <FraudLogTable logs={logs} />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
