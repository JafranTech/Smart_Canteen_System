import { useState } from 'react'
import clsx from 'clsx'
import { Plus, Minus } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'

export default function MenuCard({ item }) {
  const { addItem, updateQty, items } = useCart()
  const [imgError, setImgError] = useState(false)
  
  const cartItem = items.find(i => i.id === item.id)
  const currentQty = cartItem ? cartItem.quantity : 0

  const isOutOfStock = item.stock_quantity === 0
  const isLowStock = !isOutOfStock && item.stock_quantity <= 5
  
  // Disable adding more if we reached stock limit
  const maxReached = currentQty >= item.stock_quantity

  const handleAdd = () => {
    if (!isOutOfStock && !maxReached) {
      if (currentQty === 0) {
        addItem(item)
      } else {
        updateQty(item.id, currentQty + 1)
      }
    }
  }

  const handleRemove = () => {
    if (currentQty > 0) {
      updateQty(item.id, currentQty - 1)
    }
  }

  const getCategoryImage = (category) => {
    switch(category) {
      case 'Meals': return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
      case 'Snacks': return 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'
      case 'Beverages': return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'
      default: return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
    }
  }

  return (
    <div className={clsx(
      "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative transition-all duration-200 flex flex-col h-full",
      isOutOfStock ? "opacity-75 grayscale-[0.8]" : "hover:shadow-md hover:-translate-y-0.5"
    )}>
      {/* Optional Top Badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
        {isOutOfStock && (
          <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm">
            Out of Stock
          </span>
        )}
        {isLowStock && (
          <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm">
            Only {item.stock_quantity} left
          </span>
        )}
      </div>

      {/* Image with fallback */}
      <div className="w-full h-32 sm:h-40 bg-gray-100 relative shrink-0">
        <img 
          src={item.image_url || getCategoryImage(item.category)} 
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
          }}
          alt={item.name} 
          className="w-full h-full object-cover" 
          loading="lazy" 
        />
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1">{item.name}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 min-h-[40px]">
            {item.description || 'No description available.'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2 border-t border-gray-50">
          <span className="text-[20px] font-bold text-[#FB3640]">
            ₹{item.price}
          </span>
          
          {/* Action Area */}
          <div className="flex items-center gap-2">
            {currentQty > 0 ? (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1">
                <button 
                  onClick={handleRemove}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-imperial active:scale-95 transition-all"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <span className="text-sm font-semibold w-4 text-center">{currentQty}</span>
                <button 
                  onClick={handleAdd}
                  disabled={maxReached}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAdd}
                disabled={isOutOfStock}
                className="w-10 h-10 rounded-full text-white bg-gradient-to-br from-[#000F08] to-[#FB3640] hover:scale-105 active:scale-95 shadow-lg shadow-[#FB3640]/30 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-shrink-0 items-center justify-center"
                aria-label="Add to Cart"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
