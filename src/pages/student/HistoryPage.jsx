import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Clock, CheckCircle2, Check, PackageOpen, Loader2, QrCode } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useOrderHistory } from '../../hooks/useOrders.js'
import clsx from 'clsx'

export default function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: orders, isLoading, error } = useOrderHistory(user?.id)

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'paid':
        return { text: 'Paid', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3 mr-1" /> }
      case 'ready':
        return { text: 'Ready', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> }
      case 'collected':
        return { text: 'Collected', color: 'bg-blue-100 text-blue-700', icon: <Check className="w-3 h-3 mr-1" /> }
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-700', icon: null }
      default:
        return { text: status, color: 'bg-gray-100 text-gray-700', icon: null }
    }
  }

  const handleViewQR = (qrToken) => {
    if (qrToken) {
      localStorage.setItem('latest_qr_token', qrToken)
      navigate('/student/qr')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <nav className="sticky top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <button 
            onClick={() => navigate('/student/menu')}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Order History</h1>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-imperial text-opacity-50" />
            <p className="font-medium text-sm">Loading your orders...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-medium shadow-sm">
            {error.message || 'Failed to load order history.'}
          </div>
        )}

        {!isLoading && !error && (!orders || orders.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <PackageOpen className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-8 max-w-xs">
              When you place an order, it will appear here.
            </p>
            <button
              onClick={() => navigate('/student/menu')}
              className="bg-white border-2 border-imperial text-imperial font-bold py-3 px-8 rounded-full hover:bg-imperial hover:text-white transition-all duration-200"
            >
              Start Ordering
            </button>
          </div>
        )}

        {!isLoading && orders?.length > 0 && (
          <div className="space-y-4 animate-fade-in-up">
            {orders.map((order) => {
              const statusDisplay = getStatusDisplay(order.status)
              const dateObj = new Date(order.created_at)
              const formattedDate = format(dateObj, "MMM d, yyyy '•' h:mm a")

              return (
                <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        ORDER #{order.id.split('-')[0]}
                      </p>
                      <p className="text-xs font-semibold text-gray-500">{formattedDate}</p>
                    </div>
                    <div className={clsx("flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide", statusDisplay.color)}>
                      {statusDisplay.icon}
                      {statusDisplay.text}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2 border border-gray-100">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <span className="text-gray-400 font-bold">{item.quantity}x</span>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{item.menu_items?.name || 'Item'}</span>
                        </div>
                        <span className="text-gray-600 font-semibold whitespace-nowrap">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">Total Paid</span>
                    <span className="text-lg font-black text-imperial">₹{Number(order.total_amount).toFixed(2)}</span>
                  </div>

                  {(order.status === 'paid' || order.status === 'ready') && order.qr_token && (
                    <button 
                      onClick={() => handleViewQR(order.qr_token)}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#000F08] to-[#1a1a1a] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      <QrCode className="w-4 h-4" />
                      View QR Code
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

