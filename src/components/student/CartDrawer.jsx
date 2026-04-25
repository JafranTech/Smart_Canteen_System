import { ShoppingBag, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext.jsx'

export default function CartDrawer() {
  const { itemCount, totalPrice, items } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] transition-transform duration-300 ease-in-out">
      <div 
        onClick={() => navigate('/student/checkout')}
        className="
          bg-gradient-to-r from-[#000F08] to-[#FB3640]
          rounded-2xl p-4 flex items-center justify-between
          text-white shadow-2xl shadow-[#FB3640]/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
        "
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full relative">
            <ShoppingBag className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 bg-white text-[#FB3640] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white/80">Total</span>
            <span className="text-lg font-bold">₹{totalPrice.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 font-semibold text-sm bg-white/10 px-3 py-1.5 rounded-full">
          <span>View Cart</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}
