import { useQuery } from '@tanstack/react-query'
import { HardDrive, AlertTriangle } from 'lucide-react'
import { fetchDbSizeMb } from '../../utils/archiveUtils.js'

// ─── Constants ───────────────────────────────────────────────
const FREE_TIER_MB   = 500
const WARN_THRESHOLD = 70   // yellow
const CRIT_THRESHOLD = 90   // red

// ─── Helpers ─────────────────────────────────────────────────
function getBarColor(pct) {
  if (pct >= CRIT_THRESHOLD) return 'bg-[#FB3640]'
  if (pct >= WARN_THRESHOLD) return 'bg-amber-400'
  return 'bg-green-500'
}

function getTextColor(pct) {
  if (pct >= CRIT_THRESHOLD) return 'text-[#FB3640]'
  if (pct >= WARN_THRESHOLD) return 'text-amber-600'
  return 'text-green-600'
}

// ─── Main Component ──────────────────────────────────────────
export default function StorageWidget() {
  const { data: sizeMb, isLoading } = useQuery({
    queryKey:  ['db_size'],
    queryFn:   fetchDbSizeMb,
    staleTime: 5 * 60 * 1000,   // refresh every 5 minutes
    retry:     1,
  })

  // If the RPC function doesn't exist yet, sizeMb will be null — hide widget
  if (!isLoading && sizeMb === null) return null

  const pct      = sizeMb != null ? Math.min(Math.round((sizeMb / FREE_TIER_MB) * 100), 100) : 0
  const isCrit   = pct >= CRIT_THRESHOLD
  const isWarn   = pct >= WARN_THRESHOLD

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      isCrit ? 'border-red-200 bg-red-50' : isWarn ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'
    } shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isCrit ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-gray-100'
          }`}>
            {isCrit || isWarn
              ? <AlertTriangle className={`w-4 h-4 ${isCrit ? 'text-[#FB3640]' : 'text-amber-500'}`} />
              : <HardDrive className="w-4 h-4 text-gray-400" />
            }
          </div>
          <p className="font-black text-sm text-gray-900">Database Storage</p>
        </div>

        {isLoading ? (
          <span className="text-xs text-gray-400 font-bold">Checking...</span>
        ) : (
          <span className={`text-sm font-black ${getTextColor(pct)}`}>{pct}% used</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden mb-3">
        {!isLoading && (
          <div
            className={`h-full rounded-full transition-all duration-700 ${getBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 font-medium">
          {isLoading ? '— MB' : `~${sizeMb?.toFixed(1)} MB`} of {FREE_TIER_MB} MB
        </span>
        <span className="text-xs text-gray-400">Supabase Free Tier (estimated)</span>
      </div>

      {/* Critical Warning */}
      {isCrit && !isLoading && (
        <div className="mt-3 bg-red-100 border border-red-200 rounded-xl px-4 py-2">
          <p className="text-xs font-black text-[#FB3640]">
            🔴 Storage critical. Archive old data immediately to prevent service interruption.
          </p>
        </div>
      )}

      {isWarn && !isCrit && !isLoading && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <p className="text-xs font-bold text-amber-700">
            ⚠️ Storage above 70%. Consider archiving collected orders soon.
          </p>
        </div>
      )}
    </div>
  )
}
