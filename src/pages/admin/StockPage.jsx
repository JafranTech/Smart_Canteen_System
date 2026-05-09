import { useState } from 'react'
import { Loader2, AlertCircle, RefreshCw, Sun, Zap } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'
import StockEditor from '../../components/admin/StockEditor.jsx'
import AdminLayout from '../../components/admin/AdminLayout.jsx'

// ─── Constants ────────────────────────────────────────────────
const TODAY_LABEL = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export default function StockPage() {
  const queryClient                = useQueryClient()
  const [isResetting, setIsResetting] = useState(false)

  const { data: menuItems, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'stock_items'],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, category, image_url, stock_quantity, daily_stock_limit, daily_extra_stock, stock_reset_date, is_available')
        .order('stock_quantity', { ascending: true })

      if (error) throw new Error('Unable to load stock data.')
      return data
    },
  })

  // Counts
  const outOfStockCount = menuItems?.filter(i => i.stock_quantity === 0).length || 0
  const lowStockCount   = menuItems?.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 5).length || 0
  const extraActiveCount = menuItems?.filter(i => (i.daily_extra_stock ?? 0) > 0).length || 0

  // Manual reset — triggers the reset_daily_stock() DB function
  const handleManualReset = async () => {
    setIsResetting(true)
    try {
      const { error } = await supabase.rpc('reset_daily_stock')
      if (error) throw error
      toast.success('All stock levels reset to daily limits.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'stock_items'] })
    } catch (err) {
      console.error('[StockPage] Manual reset failed:', err)
      toast.error('Reset failed. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in relative">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Stock Levels</h1>
            <p className="text-gray-500 font-medium mt-1 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              Daily limits for {TODAY_LABEL} — resets automatically at midnight.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {outOfStockCount > 0 && (
              <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FB3640] animate-pulse" />
                <span className="text-sm font-bold text-red-700">{outOfStockCount} Sold Out</span>
              </div>
            )}
            {lowStockCount > 0 && (
              <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-bold text-amber-700">{lowStockCount} Critical</span>
              </div>
            )}
            {extraActiveCount > 0 && (
              <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">{extraActiveCount} With Extra Today</span>
              </div>
            )}
            <button
              onClick={handleManualReset}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 bg-night text-white text-sm font-bold rounded-xl hover:bg-night/80 disabled:opacity-60 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting...' : 'Reset All Now'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error.message}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-[#FB3640]" />
            <p className="mt-4 text-gray-500 font-medium tracking-wide">Loading stock...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems?.map(item => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${
                  item.stock_quantity === 0
                    ? 'border-red-200 bg-red-50/30'
                    : item.stock_quantity <= 5
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3 mb-5">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shadow-sm shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 leading-tight truncate">{item.name}</h3>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold mt-1">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100/60">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Today's Inventory
                  </p>
                  <StockEditor item={item} onUpdate={refetch} />
                </div>
              </div>
            ))}

            {menuItems?.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Items Found</h3>
                <p className="text-gray-500">Go to Menu Manager to create items first.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
