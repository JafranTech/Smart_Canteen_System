import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { QrCode, ArrowLeft, AlertTriangle, XCircle, LogOut, UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useQR } from '../../hooks/useQR.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import ScannerView from '../../components/staff/ScannerView.jsx'
import OrderVerifyCard from '../../components/staff/OrderVerifyCard.jsx'
import DeliverButton from '../../components/staff/DeliverButton.jsx'

export default function ScannerPage() {
  const { verifyQR, deliverOrder, isVerifying, isDelivering } = useQR()
  const { user, signOut } = useAuth() // Get current staff ID + logout
  const queryClient = useQueryClient()
  const [scannedOrder, setScannedOrder] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [fraudAlert, setFraudAlert] = useState(null)

  // Live active orders count (status: 'paid' | 'ready')
  const { data: activeOrders } = useQuery({
    queryKey: ['active_orders_count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status')
        .in('status', ['paid', 'ready'])
      if (error) return []
      return data || []
    },
    refetchInterval: 10000 // Background polling fallback
  })

  const activeCount = activeOrders?.length || 0

  // Realtime subscription to instantly update badge when new order arrives or gets collected
  useEffect(() => {
    const channel = supabase
      .channel('scanner_active_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['active_orders_count'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const getFraudMessage = (reason) => {
    switch (reason) {
      case 'invalid_qr': return 'Unrecognized, corrupted, or invalid QR code.'
      case 'duplicate_scan': return 'This QR code has already been scanned and collected.'
      case 'expired_order': return 'This order has exceeded its valid timeframe and expired.'
      default: return 'Suspicious scan detected.'
    }
  }

  const handleScanSuccess = async (decodedText) => {
    // Only verify if we are not already showing a result or alert
    if (scannedOrder || isVerifying || isSuccess || fraudAlert) return

    // Pass user.id to verifyQR so it can log fraud attempts
    const result = await verifyQR(decodedText, user?.id)
    
    if (!result.valid) {
      setFraudAlert({
        reason: result.reason,
        message: getFraudMessage(result.reason),
        order: result.order
      })
      toast.error('Alert: Invalid Order Scan', { style: { background: '#FB3640', color: '#fff' } })
      return
    }

    // Success! Show order details.
    setScannedOrder(result.order)
    setIsSuccess(false) // Ready to deliver
    toast.success('Valid Order Found!')
  }

  const handleDeliver = async () => {
    if (!scannedOrder) return
    try {
      await deliverOrder(scannedOrder.id)
      setIsSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['active_orders_count'] })
      toast.success('Order Marked as Collected!')
    } catch (err) {
      toast.error(err.message || 'Failed to deliver order.')
    }
  }

  const handleReset = () => {
    setScannedOrder(null)
    setIsSuccess(false)
    setFraudAlert(null)
  }

  return (
    <div className="min-h-screen bg-night text-white flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-sm flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Smart Canteen" className="w-9 h-9 rounded-full shadow-md border border-white/20" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-tight">Staff Scanner</h1>
            <p className="text-[11px] text-white/50 font-medium">Counter Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Orders Queue with Amazon-style live badge */}
          <Link 
            to="/staff/orders" 
            aria-label="Active Orders Queue"
            title="View Active Orders"
            className="relative p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/15 transition-all flex items-center justify-center text-white group"
          >
            <UtensilsCrossed className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FB3640] text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-night shadow-md animate-pulse">
                {activeCount > 99 ? '99+' : activeCount}
              </span>
            )}
          </Link>

          <button
            onClick={signOut}
            aria-label="Log out"
            title="Sign Out"
            className="p-2.5 bg-white/10 rounded-2xl hover:bg-red-500/20 hover:text-imperial border border-white/15 transition-all cursor-pointer text-white"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-sm flex flex-col items-center px-6 pb-12 relative">
        
        {/* FRAUD ALERT MODAL */}
        {fraudAlert && (
          <div className="absolute inset-0 bg-night/95 z-50 flex flex-col items-center justify-center animate-fade-in p-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <AlertTriangle className="w-10 h-10 text-imperial" />
            </div>
            
            <h2 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-wide">
              Scan Rejected
            </h2>
            
            <p className="text-red-400 font-bold text-center mb-4 uppercase text-sm tracking-wider bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
              Reason: {fraudAlert.reason.replace('_', ' ')}
            </p>
            
            <p className="text-white/80 text-center mb-8">{fraudAlert.message}</p>
            
            <div className="bg-white/5 w-full rounded-2xl p-4 mb-8 border border-white/10 text-sm">
              <p className="text-white/40 mb-1">Attempt Logged.</p>
              {fraudAlert.order && (
                <p className="text-white/80 font-mono">Order ID: {fraudAlert.order.id.split('-')[0].toUpperCase()}</p>
              )}
            </div>

            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full font-bold text-white w-full justify-center"
            >
              <XCircle className="w-5 h-5" /> Dismiss & Scan Again
            </button>
          </div>
        )}

        {!scannedOrder && !fraudAlert ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Ready to Scan</h2>
              <p className="text-white/60 text-sm">Align the QR code within the frame to verify the order.</p>
            </div>
            
            <ScannerView onScanSuccess={handleScanSuccess} />
            
            {isVerifying && (
              <p className="mt-8 text-sm text-white/60 animate-pulse font-bold tracking-widest uppercase">
                Verifying token...
              </p>
            )}
          </>
        ) : (
          !fraudAlert && (
            <div className="w-full flex flex-col items-center animate-fade-in text-gray-900 z-10">
              <button 
                onClick={handleReset}
                className="self-start flex items-center text-sm font-bold text-white/60 hover:text-white mb-2 transition-colors -ml-2 p-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Scan Another
              </button>
              
              <OrderVerifyCard order={scannedOrder} />
              
              <DeliverButton 
                onClick={handleDeliver} 
                isDelivering={isDelivering} 
                disabled={isSuccess || scannedOrder?.status === 'collected'} 
              />
            </div>
          )
        )}
      </main>
    </div>
  )
}
