import { useState } from 'react'
import toast from 'react-hot-toast'
import { QrCode, ArrowLeft, AlertTriangle, XCircle, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQR } from '../../hooks/useQR.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ScannerView from '../../components/staff/ScannerView.jsx'
import OrderVerifyCard from '../../components/staff/OrderVerifyCard.jsx'
import DeliverButton from '../../components/staff/DeliverButton.jsx'

export default function ScannerPage() {
  const { verifyQR, deliverOrder, isVerifying, isDelivering } = useQR()
  const { user, signOut } = useAuth() // Get current staff ID + logout
  const [scannedOrder, setScannedOrder] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [fraudAlert, setFraudAlert] = useState(null)

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
        <h1 className="text-xl font-black tracking-tight">Scanner</h1>
        <div className="flex items-center gap-2">
          <Link to="/staff/orders" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <button
            onClick={signOut}
            aria-label="Log out"
            className="p-2 bg-white/10 rounded-full hover:bg-red-500/20 hover:text-imperial transition-colors cursor-pointer"
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
