import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Clock, Check } from 'lucide-react'
import clsx from 'clsx'

export default function QRCard({ order }) {
  if (!order) return null

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'paid':
        return { 
          text: 'Order Received', 
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: <Clock className="w-4 h-4 mr-1.5" />,
          pulse: 'bg-amber-500'
        }
      case 'ready':
        return { 
          text: 'Ready for Pickup', 
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />,
          pulse: 'bg-green-500'
        }
      case 'collected':
        return { 
          text: 'Collected', 
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: <Check className="w-4 h-4 mr-1.5" />,
          pulse: null
        }
      default:
        return { 
          text: status.toUpperCase(), 
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: null,
          pulse: null
        }
    }
  }

  const statusDisplay = getStatusDisplay(order.status)
  const isCollected = order.status === 'collected'

  return (
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
      {/* Status Banner */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</span>
        <div className={clsx("flex items-center px-3 py-1.5 rounded-full border text-xs font-bold shadow-sm", statusDisplay.color)}>
          {statusDisplay.pulse && (
            <span className="relative flex h-2 w-2 mr-2">
              <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusDisplay.pulse)}></span>
              <span className={clsx("relative inline-flex rounded-full h-2 w-2", statusDisplay.pulse)}></span>
            </span>
          )}
          {!statusDisplay.pulse && statusDisplay.icon}
          {statusDisplay.text}
        </div>
      </div>

      <div className="p-8 flex flex-col items-center relative">
        {/* Scanned / Overlay */}
        {isCollected && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Order Collected</h3>
            <p className="text-sm text-gray-500 mt-1">Enjoy your meal!</p>
          </div>
        )}

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.05)] border border-gray-100 mb-6">
          <QRCodeSVG 
            value={order.qr_token || 'pending'} 
            size={220}
            level="H"
            includeMargin={false}
            className={clsx("transition-opacity duration-300", isCollected ? "opacity-20" : "opacity-100")}
          />
        </div>
        
        <p className="font-mono text-gray-900 font-bold text-lg tracking-widest">{order.id?.split('-')[0].toUpperCase()}</p>
        <p className="text-xs text-gray-400 mt-1">ORDER ID</p>
      </div>

      {/* Items Recap */}
      <div className="bg-gray-50 p-6 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-wide uppercase">Order Details</h3>
        <ul className="space-y-3">
          {order.order_items?.map((item, idx) => (
            <li key={idx} className="flex justify-between items-start text-sm">
              <div className="flex gap-2 text-gray-700">
                <span className="font-semibold text-gray-900">{item.quantity}x</span>
                <span>{item.menu_items?.name || 'Item'}</span>
              </div>
              <span className="font-medium text-gray-900">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <span className="font-bold text-gray-900">Total Paid</span>
          <span className="text-lg font-black text-[#FB3640]">₹{Number(order.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
