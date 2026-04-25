import { CreditCard, Loader2 } from 'lucide-react'

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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => !isProcessing && onClose()}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-up-bottom overflow-hidden">
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-imperial animate-spin mb-4" />
            <p className="text-gray-900 font-bold">Processing Payment...</p>
            <p className="text-sm text-gray-500 mt-1">Please do not close the app</p>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900">Confirm Payment</h2>
          <p className="text-gray-500 mt-1 text-sm">You are about to pay</p>
          <div className="text-4xl font-black text-imperial mt-3">₹{totalPrice?.toFixed(2)}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Total Items</span>
            <span className="font-bold text-gray-900">{itemsCount}</span>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-imperial/20 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-imperial/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-imperial" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Demo Wallet</h4>
              <p className="text-xs text-green-600 font-medium tracking-wide">Balance: ₹1,500.00</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            disabled={isProcessing}
            onClick={onConfirm}
            className="w-full bg-[#000F08] text-white font-bold py-4 rounded-full shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            Confirm & Pay
          </button>
          <button
            disabled={isProcessing}
            onClick={onClose}
            className="w-full text-gray-500 font-bold py-4 rounded-full hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
