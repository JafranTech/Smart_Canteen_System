import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Download, FileSpreadsheet, FileText,
  Trash2, AlertTriangle, X, Loader2,
} from 'lucide-react'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils.js'
import {
  fetchOrdersForExport,
  fetchTodayStats,
  archiveCollectedOrders,
} from '../../utils/archiveUtils.js'
import { useQuery } from '@tanstack/react-query'

// ─── Constants ───────────────────────────────────────────────
const TODAY     = format(new Date(), 'yyyy-MM-dd')
const TODAY_LABEL = format(new Date(), 'dd MMM yyyy')
const FREE_TIER_LIMIT_MB = 500

// ─── Sub-components ──────────────────────────────────────────

function StatPill({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 min-w-[100px] flex-1">
      <span className={`text-2xl font-black ${accent ?? 'text-gray-900'}`}>{value}</span>
      <span className="text-xs font-bold text-gray-400 mt-1 text-center">{label}</span>
    </div>
  )
}

function ArchiveModal({ count, fromLabel, toLabel, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-fade-in">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-6 mx-auto">
          <AlertTriangle className="w-7 h-7 text-[#FB3640]" />
        </div>
        <h3 className="text-xl font-black text-gray-900 text-center mb-2">Are you sure?</h3>
        <p className="text-sm text-gray-500 text-center mb-2">
          You are about to permanently delete
        </p>
        <p className="text-center font-black text-[#FB3640] text-lg mb-1">{count} collected orders</p>
        <p className="text-xs text-gray-400 text-center mb-6">
          from {fromLabel} to {toLabel}. This cannot be undone.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
          <p className="text-xs text-amber-700 font-bold text-center">
            ✓ Pending and paid orders will NOT be deleted.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-[#FB3640] text-white font-black text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
              : <><Trash2 className="w-4 h-4" /> Yes, Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function ExportPanel() {
  const queryClient = useQueryClient()

  const [fromDate, setFromDate] = useState(TODAY)
  const [toDate,   setToDate]   = useState(TODAY)
  const [isExporting,  setIsExporting]  = useState(false)
  const [isArchiving,  setIsArchiving]  = useState(false)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [exportedOrders, setExportedOrders] = useState([])

  // Today's stats strip
  const { data: stats } = useQuery({
    queryKey: ['export_stats'],
    queryFn:  fetchTodayStats,
    staleTime: 30_000,
  })

  const fromLabel = format(new Date(fromDate), 'dd MMM yyyy')
  const toLabel   = format(new Date(toDate),   'dd MMM yyyy')
  const fileDate  = fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`

  const handleDownload = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    setHasDownloaded(false)

    try {
      const orders = await fetchOrdersForExport(new Date(fromDate), new Date(toDate))

      if (orders.length === 0) {
        toast.error('No collected orders found for this date range.')
        return
      }

      const dateLabel = fromDate === toDate ? fromLabel : `${fromLabel} – ${toLabel}`
      exportToExcel(orders, dateLabel, fileDate)
      exportToPDF(orders, dateLabel, fileDate)

      setExportedOrders(orders)
      setHasDownloaded(true)
      toast.success(`Downloaded ${orders.length} orders successfully!`)
    } catch (err) {
      toast.error(err.message ?? 'Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [fromDate, toDate, fromLabel, toLabel, fileDate, isExporting])

  const handleArchiveConfirm = useCallback(async () => {
    setIsArchiving(true)
    try {
      const { deletedCount } = await archiveCollectedOrders(new Date(fromDate), new Date(toDate))
      toast.success(`${deletedCount} orders archived and removed from the database.`)
      setShowModal(false)
      setHasDownloaded(false)
      setExportedOrders([])
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['export_stats'] })
    } catch (err) {
      toast.error(err.message ?? 'Archive failed. No data was deleted.')
      setShowModal(false)
    } finally {
      setIsArchiving(false)
    }
  }, [fromDate, toDate, queryClient])

  return (
    <>
      {showModal && (
        <ArchiveModal
          count={exportedOrders.length}
          fromLabel={fromLabel}
          toLabel={toLabel}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setShowModal(false)}
          isLoading={isArchiving}
        />
      )}

      <div className="mt-10 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="bg-[#000F08] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-lg tracking-tight">Export &amp; Archive</h2>
            <p className="text-white/40 text-sm mt-0.5">Download sales reports and free up database storage.</p>
          </div>
          <FileText className="w-8 h-8 text-[#FB3640] opacity-80" />
        </div>

        <div className="p-8 space-y-8">
          {/* Stats Strip */}
          {stats && (
            <div className="flex gap-3 flex-wrap">
              <StatPill label="Total Orders Today" value={stats.totalToday} />
              <StatPill
                label="Collected Today"
                value={stats.collectedToday}
                accent="text-green-600"
              />
              <StatPill
                label="Today's Revenue"
                value={`₹${stats.revenueToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                accent="text-[#FB3640]"
              />
            </div>
          )}

          {/* Date Range Picker */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Date Range</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500">From</label>
                <input
                  type="date"
                  value={fromDate}
                  max={TODAY}
                  onChange={(e) => { setFromDate(e.target.value); setHasDownloaded(false) }}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500">To</label>
                <input
                  type="date"
                  value={toDate}
                  max={TODAY}
                  min={fromDate}
                  onChange={(e) => { setToDate(e.target.value); setHasDownloaded(false) }}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30"
                />
              </div>

              {/* Quick presets */}
              <div className="flex gap-2">
                {[
                  { label: 'Today',      from: TODAY,                               to: TODAY },
                  { label: 'Yesterday',  from: format(subDays(new Date(), 1), 'yyyy-MM-dd'), to: format(subDays(new Date(), 1), 'yyyy-MM-dd') },
                  { label: 'Last 7d',    from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: TODAY },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setFromDate(p.from); setToDate(p.to); setHasDownloaded(false) }}
                    className="px-3 py-2 text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors text-gray-600"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Download Report — {fromLabel}{fromDate !== toDate ? ` to ${toLabel}` : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                id="btn-download-report"
                onClick={handleDownload}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-3 bg-[#000F08] hover:bg-gray-900 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {isExporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  : <><Download className="w-4 h-4" /> Download PDF &amp; Excel</>
                }
              </button>

              {hasDownloaded && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                  {exportedOrders.length} orders exported ✓
                </div>
              )}
            </div>
          </div>

          {/* Archive Zone — locked until downloaded */}
          <div className={`rounded-2xl border-2 transition-all duration-300 ${
            hasDownloaded
              ? 'border-red-200 bg-red-50/50'
              : 'border-gray-100 bg-gray-50 opacity-60'
          }`}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  hasDownloaded ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {hasDownloaded
                    ? <Trash2 className="w-5 h-5 text-[#FB3640]" />
                    : <X className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div className="flex-1">
                  <h3 className={`font-black text-sm mb-1 ${hasDownloaded ? 'text-red-700' : 'text-gray-400'}`}>
                    {hasDownloaded ? '⚠️ Archive & Delete from Database' : '🔒 Archive Locked'}
                  </h3>
                  <p className={`text-xs leading-relaxed ${hasDownloaded ? 'text-red-600/80' : 'text-gray-400'}`}>
                    {hasDownloaded
                      ? `This will permanently delete ${exportedOrders.length} collected orders (${fromLabel}${fromDate !== toDate ? ` – ${toLabel}` : ''}) from the database to free up storage. Pending and paid orders will never be affected.`
                      : 'Download the report first to unlock the archive option.'
                    }
                  </p>

                  {hasDownloaded && (
                    <button
                      id="btn-archive-orders"
                      onClick={() => setShowModal(true)}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#FB3640] hover:bg-red-600 text-white font-black text-sm rounded-xl transition-all active:scale-95 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Archive {exportedOrders.length} Orders
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
