import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, PackageOpen, Clock, CheckCircle2, Check, WifiOff } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import QRCard from '../../components/student/QRCard.jsx'

// ─── Constants ───────────────────────────────────────────────
const QR_CACHE_PREFIX = 'canteen_qr_'

function getCachedQR(orderId) {
  return localStorage.getItem(`${QR_CACHE_PREFIX}${orderId}`)
}

function setCachedQR(orderId, token) {
  localStorage.setItem(`${QR_CACHE_PREFIX}${orderId}`, token)
}

function removeCachedQR(orderId) {
  localStorage.removeItem(`${QR_CACHE_PREFIX}${orderId}`)
}

// ─── Status helpers ──────────────────────────────────────────
function getStatusDisplay(status) {
  switch (status) {
    case 'paid':
      return {
        text:   'Order Received',
        color:  'bg-amber-100 text-amber-700 border-amber-200',
        icon:   <Clock className="w-4 h-4 mr-1.5" />,
        pulse:  'bg-amber-500',
      }
    case 'ready':
      return {
        text:   'Ready for Pickup',
        color:  'bg-green-100 text-green-700 border-green-200',
        icon:   <CheckCircle2 className="w-4 h-4 mr-1.5" />,
        pulse:  'bg-green-500',
      }
    case 'collected':
      return {
        text:   'Collected',
        color:  'bg-blue-100 text-blue-700 border-blue-200',
        icon:   <Check className="w-4 h-4 mr-1.5" />,
        pulse:  null,
      }
    default:
      return {
        text:   (status || '').toUpperCase(),
        color:  'bg-gray-100 text-gray-700 border-gray-200',
        icon:   null,
        pulse:  null,
      }
  }
}

// ─── Main Component ───────────────────────────────────────────
export default function QRPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)

  const latestOrderId = localStorage.getItem('latest_order_id')
  const latestToken = localStorage.getItem('latest_qr_token')

  useEffect(() => {
    let orderId = latestOrderId

    const fetchOrder = async () => {
      try {
        setLoading(true)

        // If we don't have an order ID in localStorage, fetch the most recent active order for the student
        if (!orderId && user) {
          const { data: latestActive, error: searchErr } = await supabase
            .from('orders')
            .select('*, order_items(*, menu_items(name))')
            .eq('student_id', user.id)
            .in('status', ['paid', 'ready'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!searchErr && latestActive) {
            orderId = latestActive.id
            localStorage.setItem('latest_order_id', orderId)
            if (latestActive.qr_token) {
              localStorage.setItem('latest_qr_token', latestActive.qr_token)
            }
            setOrder(latestActive)
            setLoading(false)
            return
          }
        }

        if (!orderId) {
          // Check offline cache fallback
          if (latestToken) {
            setOrder({ id: 'OFFLINE', qr_token: latestToken, status: 'paid', order_items: [] })
            setFromCache(true)
            setLoading(false)
            return
          }
          setError('No active order found.')
          setLoading(false)
          return
        }

        // 1. Fetch latest live order details from Supabase
        const { data, error: fetchErr } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name))')
          .eq('id', orderId)
          .single()

        if (!fetchErr && data) {
          if (data.qr_token) {
            setCachedQR(orderId, data.qr_token)
          }
          setOrder(data)
          setFromCache(false)
          setError(null)
          return
        }

        // 2. Fallback to cache only if offline or network error
        const cached = getCachedQR(orderId)
        if (cached) {
          setOrder((prev) => prev || { id: orderId, qr_token: cached, status: 'paid', order_items: [] })
          setFromCache(true)
        } else if (latestToken) {
          setOrder({ id: orderId || 'ACTIVE', qr_token: latestToken, status: 'paid', order_items: [] })
          setFromCache(true)
        } else {
          setError('Failed to load order details.')
        }
      } catch (err) {
        console.error('[QRPage] Failed to load order:', err)
        const cached = getCachedQR(orderId)
        if (cached) {
          setOrder((prev) => prev || { id: orderId, qr_token: cached, status: 'paid', order_items: [] })
          setFromCache(true)
        } else if (latestToken) {
          setOrder({ id: orderId || 'ACTIVE', qr_token: latestToken, status: 'paid', order_items: [] })
          setFromCache(true)
        } else {
          setError('Failed to load order details.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()

    // Realtime: update order status live
    if (orderId) {
      const subscription = supabase
        .channel(`order:${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
          (payload) => {
            setOrder((prev) => (prev ? { ...prev, status: payload.new.status } : null))

            if (payload.new.status === 'collected') {
              removeCachedQR(orderId)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [user, latestOrderId, latestToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-night to-imperial flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-night to-imperial flex flex-col items-center justify-center p-6 text-center text-white">
        <PackageOpen className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">Oops!</h2>
        <p className="text-white/80 mb-8">{error || 'No active order found.'}</p>
        <button
          onClick={() => navigate('/student/menu')}
          className="bg-white text-imperial font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          Return to Menu
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-night to-imperial flex flex-col">
      {/* Header */}
      <nav className="px-4 py-4 sm:px-6 flex items-center">
        <button
          onClick={() => navigate('/student/menu')}
          className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md hover:bg-black/30 transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1" />
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-12 animate-fade-in-up">
        <h1 className="text-3xl font-black text-white text-center mb-2 shadow-sm">Your Order QR</h1>
        <p className="text-white/80 text-center mb-8 text-sm">Scan this at the counter to collect your food</p>

        {/* Offline badge */}
        {fromCache && (
          <div className="flex items-center gap-1.5 mb-4 text-white/40 text-xs">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Cached — works offline</span>
          </div>
        )}

        {/* The Card */}
        <QRCard order={order} />
      </main>
    </div>
  )
}
