import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'

// ─── Constants ───────────────────────────────────────────────
const STATUS_COLORS = {
  paid: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
}

// ─── Sub-components ──────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="animate-pulse bg-gray-700 rounded-2xl h-24 w-full" />
  )
}

function OrderCard({ order }) {
  const studentName = order.profiles?.name || 'Unknown Student'
  const collegeId   = order.profiles?.college_id || '—'
  const items       = order.order_items
    ?.map((oi) => `${oi.menu_items?.name} ×${oi.quantity}`)
    .join(', ') || '—'
  const timeAgo     = formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
  const badgeClass  = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-bold text-white text-sm">{studentName}</p>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
          {order.status.toUpperCase()}
        </span>
      </div>
      <p className="text-white/50 text-xs font-mono">{collegeId}</p>
      <p className="text-white/70 text-sm truncate">{items}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-imperial font-bold text-sm">
          ₹{parseFloat(order.total_amount).toFixed(2)}
        </span>
        <span className="text-white/40 text-xs">{timeAgo}</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function ActiveOrdersPage() {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['active_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (name, college_id),
          order_items (quantity, menu_items (name))
        `)
        .in('status', ['paid', 'ready'])
        .order('created_at', { ascending: false })

      if (error) throw new Error('Unable to load active orders. Please refresh.')
      return data
    },
  })

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('active_orders_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['active_orders'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['active_orders'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return (
    <div className="min-h-screen bg-night text-white flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-sm flex items-center justify-between p-6 sticky top-0 bg-night/90 backdrop-blur-md z-10 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            to="/staff/scanner"
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Back to scanner"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">Active Orders</h1>
        </div>
        <button
          onClick={signOut}
          aria-label="Log out"
          className="p-2 bg-white/10 rounded-full hover:bg-red-500/20 hover:text-imperial transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 w-full max-w-sm px-6 py-6 space-y-4 pb-24">
        {isLoading ? (
          <>
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-bold">Failed to load orders</p>
            <p className="text-white/50 text-sm mt-1">{error.message}</p>
          </div>
        ) : !orders?.length ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-lg font-bold text-white mb-2">No active orders right now</h3>
            <p className="text-white/40 text-sm">New orders will appear here in real time.</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider pl-1">
              Active ({orders.length})
            </p>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </>
        )}
      </main>
    </div>
  )
}
