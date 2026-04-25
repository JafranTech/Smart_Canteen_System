import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingBag, ShieldCheck } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { placeOrder } from '../../hooks/useOrders.js'
import PaymentModal from '../../components/student/PaymentModal.jsx'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function CheckoutPage() {
  const { items, totalPrice, updateQty, removeItem, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Empty State Return
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 text-center max-w-xs">
          Looks like you haven't added anything to your cart yet.
        </p>
        <button
          onClick={() => navigate('/student/menu')}
          className="bg-white border-2 border-imperial text-imperial font-bold py-3 px-8 rounded-full hover:bg-imperial hover:text-white transition-all duration-200"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  const handlePayNow = () => {
    setIsPaymentModalOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!user) {
      toast.error('You must be logged in to place an order.')
      return
    }

    try {
      setIsProcessing(true)
      const { qrToken } = await placeOrder(user.id, items, totalPrice)
      
      // Store token for offline access
      localStorage.setItem('latest_qr_token', qrToken)
      
      toast.success('Order placed successfully!')
      clearCart()
      navigate('/student/qr')
    } catch (error) {
      toast.error(error.message || 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
      setIsPaymentModalOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <nav className="sticky top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Order Summary</h1>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-6 animate-fade-in-up">
        {/* Cart Items List */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="p-4 flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                      {item.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate">{item.name}</h3>
                  <p className="text-lg font-bold text-imperial mt-1">₹{item.price * item.quantity}</p>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full p-1 mt-2 sm:mt-0">
                  <button 
                    onClick={() => {
                      if (item.quantity === 1) removeItem(item.id)
                      else updateQty(item.id, item.quantity - 1)
                    }}
                    className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-imperial active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock_quantity}
                    className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-green-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Bill Details */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Bill Details</h2>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Item Total</span>
            <span className="font-semibold text-gray-900">₹{totalPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Platform Fee</span>
            <span className="font-semibold text-green-600">FREE</span>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-base font-bold text-gray-900">To Pay</span>
            <span className="text-xl font-black text-imperial">₹{totalPrice.toFixed(2)}</span>
          </div>
        </section>

        {/* Info Card */}
        <div className="bg-blue-50 text-blue-800 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          <p className="text-xs leading-relaxed font-medium">
            Please collect your order within 10 minutes of it being ready. Payments are securely processed.
          </p>
        </div>
      </main>

      {/* Floating Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex flex-col flex-1 pl-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Grand Total</span>
            <span className="text-xl font-black text-gray-900">₹{totalPrice.toFixed(2)}</span>
          </div>
          <button 
            onClick={handlePayNow}
            className="flex-1 bg-gradient-to-r from-night to-imperial text-white font-bold py-3.5 px-6 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shadow-lg shadow-imperial/30 flex items-center justify-center gap-2"
          >
            Pay Now
          </button>
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        isProcessing={isProcessing}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
        totalPrice={totalPrice}
        itemsCount={items.length}
      />
    </div>
  )
}

