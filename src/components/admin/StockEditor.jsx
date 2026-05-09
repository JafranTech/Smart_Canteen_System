import { useState } from 'react'
import { Plus, Minus, Check, Loader2, Edit3, RefreshCw, Zap, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────
const MAX_STOCK  = 999
const LOW_STOCK  = 5

// ─── Sub: stepper control ─────────────────────────────────────
function Stepper({ value, min = 0, max = MAX_STOCK, onChange, disabled }) {
  return (
    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 active:bg-gray-200 transition-colors"
        aria-label="Decrease"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="w-12 text-center font-black text-gray-900 text-sm py-1 border-x border-gray-200 select-none">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled}
        className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 active:bg-gray-200 transition-colors"
        aria-label="Increase"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function StockEditor({ item, onUpdate }) {
  // Section A — Default Daily Limit (permanent)
  const [dailyLimit,    setDailyLimit]    = useState(item.daily_stock_limit ?? 0)
  const [isEditLimit,   setIsEditLimit]   = useState(false)
  const [isSavingLimit, setIsSavingLimit] = useState(false)

  // Section B — Today's Extra Stock (temporary)
  const [extraQty,      setExtraQty]      = useState(item.daily_extra_stock ?? 0)
  const [isEditExtra,   setIsEditExtra]   = useState(false)
  const [isSavingExtra, setIsSavingExtra] = useState(false)

  // Derived display values
  const remaining    = item.stock_quantity ?? 0
  const effectiveCap = (item.daily_stock_limit ?? 0) + (item.daily_extra_stock ?? 0)
  const pctUsed      = effectiveCap > 0 ? Math.round(((effectiveCap - remaining) / effectiveCap) * 100) : 0
  const isExhausted  = remaining === 0
  const hasExtra     = (item.daily_extra_stock ?? 0) > 0

  // ── Save permanent daily limit ─────────────────────────────
  const handleSaveLimit = async () => {
    setIsSavingLimit(true)
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          daily_stock_limit: dailyLimit,
          // Refresh today's pool: set stock_quantity to new limit + existing extra
          stock_quantity:    dailyLimit + (item.daily_extra_stock ?? 0),
          stock_reset_date:  new Date().toISOString().slice(0, 10),
        })
        .eq('id', item.id)

      if (error) throw error
      toast.success(`Default daily limit for ${item.name} → ${dailyLimit}`)
      setIsEditLimit(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('[StockEditor] Save limit failed:', err)
      toast.error('Failed to update daily limit.')
      setDailyLimit(item.daily_stock_limit ?? 0)
    } finally {
      setIsSavingLimit(false)
    }
  }

  // ── Save today's extra stock (via RPC — atomic, temp) ──────
  const handleSaveExtra = async () => {
    setIsSavingExtra(true)
    const currentExtra = item.daily_extra_stock ?? 0
    const diff = extraQty - currentExtra  // delta to apply

    try {
      const { error } = await supabase.rpc('add_today_extra_stock', {
        item_id:   item.id,
        extra_qty: diff,
      })

      if (error) throw error
      toast.success(
        diff > 0
          ? `+${diff} extra stock added for ${item.name} today`
          : `Extra stock reduced by ${Math.abs(diff)} for ${item.name} today`
      )
      setIsEditExtra(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('[StockEditor] Save extra failed:', err)
      toast.error('Failed to update today\'s extra stock.')
      setExtraQty(item.daily_extra_stock ?? 0)
    } finally {
      setIsSavingExtra(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Progress bar ─────────────────────────────────────── */}
      <div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isExhausted ? 'bg-red-500' : pctUsed >= 80 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`font-black text-xl ${
            isExhausted ? 'text-[#FB3640]' : remaining <= LOW_STOCK ? 'text-amber-500' : 'text-gray-900'
          }`}>
            {remaining}
            <span className="text-gray-400 text-xs font-medium ml-1">
              / {effectiveCap} remaining
            </span>
          </span>
          <span className="text-xs text-gray-400">
            {isExhausted ? 'Sold out today' : `${pctUsed}% sold`}
          </span>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* ── LEFT: Default Daily Limit (permanent) ─────────── */}
        <div className={`rounded-xl p-3 border transition-colors ${
          isEditLimit ? 'border-[#000F08] bg-gray-50' : 'border-gray-100 bg-white'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Lock className="w-3 h-3 text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Default Daily
            </p>
          </div>

          {!isEditLimit ? (
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-gray-800">{item.daily_stock_limit ?? 0}</span>
              <button
                onClick={() => { setDailyLimit(item.daily_stock_limit ?? 0); setIsEditLimit(true) }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Edit default daily limit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Stepper value={dailyLimit} onChange={setDailyLimit} disabled={isSavingLimit} />
              <div className="flex gap-1.5">
                <button
                  onClick={handleSaveLimit}
                  disabled={isSavingLimit}
                  className="flex-1 py-1 bg-[#000F08] text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isSavingLimit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button
                  onClick={() => { setDailyLimit(item.daily_stock_limit ?? 0); setIsEditLimit(false) }}
                  disabled={isSavingLimit}
                  className="px-2 py-1 border border-gray-200 text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-gray-400 leading-tight">Permanent. Changes every day.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Today's Extra Stock (temporary) ─────────── */}
        <div className={`rounded-xl p-3 border transition-colors ${
          isEditExtra
            ? 'border-amber-400 bg-amber-50/50'
            : hasExtra
            ? 'border-amber-200 bg-amber-50/30'
            : 'border-gray-100 bg-white'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className={`w-3 h-3 ${hasExtra ? 'text-amber-500' : 'text-gray-400'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              hasExtra ? 'text-amber-600' : 'text-gray-400'
            }`}>
              Extra Today
            </p>
          </div>

          {!isEditExtra ? (
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-2xl font-black ${hasExtra ? 'text-amber-600' : 'text-gray-300'}`}>
                  +{item.daily_extra_stock ?? 0}
                </span>
                {hasExtra && (
                  <p className="text-[10px] text-amber-500 font-semibold mt-0.5">Resets tomorrow</p>
                )}
              </div>
              <button
                onClick={() => { setExtraQty(item.daily_extra_stock ?? 0); setIsEditExtra(true) }}
                className={`p-1.5 rounded-lg transition-colors ${
                  hasExtra
                    ? 'text-amber-400 hover:text-amber-700 hover:bg-amber-100'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="Edit today's extra stock"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Stepper value={extraQty} min={0} onChange={setExtraQty} disabled={isSavingExtra} />
              <div className="flex gap-1.5">
                <button
                  onClick={handleSaveExtra}
                  disabled={isSavingExtra}
                  className="flex-1 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isSavingExtra ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Apply
                </button>
                <button
                  onClick={() => { setExtraQty(item.daily_extra_stock ?? 0); setIsEditExtra(false) }}
                  disabled={isSavingExtra}
                  className="px-2 py-1 border border-amber-200 text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-50"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-amber-500 leading-tight">Today only. Resets at midnight.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
