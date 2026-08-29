import { CreditCard, ShieldCheck, Loader2, Sparkles } from 'lucide-react'

export default function PaymentModal({ 
  isOpen, 
  isProcessing, 
  onClose, 
  onConfirm, 
  totalPrice, 
  itemsCount 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !isProcessing && onClose()}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-up-bottom overflow-hidden">
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-12 h-12 text-imperial animate-spin mb-4" />
            <p className="text-gray-900 font-bold text-lg">Verifying Payment & Generating QR...</p>
            <p className="text-xs text-gray-500 mt-1">Cryptographic signature verification in progress</p>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-imperial text-xs font-bold rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Razorpay Test Sandbox
          </div>
          <h2 className="text-2xl font-black text-gray-900">Payment Checkout</h2>
          <p className="text-gray-500 mt-1 text-sm">Review your order total</p>
          <div className="text-4xl font-black text-imperial mt-3">₹{totalPrice?.toFixed(2)}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Selected Items</span>
            <span className="font-bold text-gray-900">{itemsCount} items</span>
          </div>

          <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm">Cards, UPI & Netbanking</h4>
              <p className="text-xs text-gray-500 truncate">Secured with 256-bit encryption</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-green-700 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-100">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Server-verified single-use QR pickup generated upon success.</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            disabled={isProcessing}
            onClick={onConfirm}
            className="w-full bg-[#000F08] hover:bg-black text-white font-bold py-4 rounded-full shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            Pay with Razorpay
          </button>
          <button
            disabled={isProcessing}
            onClick={onClose}
            className="w-full text-gray-500 font-bold py-3.5 rounded-full hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
