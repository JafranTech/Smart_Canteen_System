import { useState } from 'react'
import clsx from 'clsx'
import { Plus, Minus } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'

// ─── Constants ────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 5
const CRITICAL_THRESHOLD  = 2

// ─── Stock Badge — Amazon-style availability label ────────────
function StockBadge({ stock }) {
  if (stock === 0) {
    return (
      <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm">
        Out of Stock
      </span>
    )
  }
  if (stock <= CRITICAL_THRESHOLD) {
    return (
      <span className="bg-red-50 text-red-600 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm animate-pulse">
        Only {stock} left!
      </span>
    )
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm">
        Only {stock} left
      </span>
    )
  }
  return null
}

// ─── Stock Text — shown below item name (Amazon "In Stock" style) ─────────
function StockText({ stock, dailyLimit, extraStock }) {
  if (stock === 0) {
    return (
      <p className="text-xs font-semibold text-red-500 mt-1">
        Sold out for today
      </p>
    )
  }
  if (stock <= CRITICAL_THRESHOLD) {
    return (
      <p className="text-xs font-semibold text-red-500 mt-1">
        ⚡ Hurry! Only {stock} remaining
      </p>
    )
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <p className="text-xs font-semibold text-amber-600 mt-1">
        🔥 Only {stock} left today
      </p>
    )
  }
  // Show extra stock banner when admin has boosted today's supply
  if (extraStock > 0) {
    return (
      <p className="text-xs font-semibold text-green-600 mt-1">
        ✅ Extra stock today! {stock} available
      </p>
    )
  }
  if (dailyLimit > 0) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        {stock} in stock today
      </p>
    )
  }
  return null
}

// ─── Fallback category images ─────────────────────────────────
function getCategoryImage(category) {
  switch (category) {
    case 'Meals':     return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
    case 'Snacks':    return 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'
    case 'Beverages': return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'
    default:          return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
  }
}

// ─── Main Component ───────────────────────────────────────────
export default function MenuCard({ item }) {
  const { addItem, updateQty, items } = useCart()
  const [imgError, setImgError]       = useState(false)

  const cartItem   = items.find(i => i.id === item.id)
  const currentQty = cartItem ? cartItem.quantity : 0

  const stock       = item.stock_quantity        // remaining today
  const dailyLimit  = item.daily_stock_limit ?? 0
  const extraStock  = item.daily_extra_stock ?? 0
  const isOutOfStock = stock === 0
  const isLowStock   = !isOutOfStock && stock <= LOW_STOCK_THRESHOLD
  const maxReached   = currentQty >= stock        // can't add more than what's left

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

  return (
    <div className={clsx(
      'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative transition-all duration-200 flex flex-col h-full',
      isOutOfStock
        ? 'opacity-75 grayscale-[0.8]'
        : 'hover:shadow-md hover:-translate-y-0.5'
    )}>

      {/* Top-right badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
        <StockBadge stock={stock} />
      </div>

      {/* Item image */}
      <div className="w-full h-32 sm:h-40 bg-gray-100 relative shrink-0">
        <img
          src={imgError ? getCategoryImage(item.category) : (item.image_url || getCategoryImage(item.category))}
          onError={() => setImgError(true)}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1">
            {item.name}
          </h3>
          <StockText stock={stock} dailyLimit={dailyLimit} extraStock={extraStock} />
          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
            {item.description || 'No description available.'}
          </p>
        </div>

        {/* Price + Cart action */}
        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2 border-t border-gray-50">
          <span className="text-[20px] font-bold text-[#FB3640]">
            ₹{item.price}
          </span>

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
                className="w-10 h-10 rounded-full text-white bg-gradient-to-br from-[#000F08] to-[#FB3640] hover:scale-105 active:scale-95 shadow-lg shadow-[#FB3640]/30 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex shrink-0 items-center justify-center"
                aria-label={isOutOfStock ? 'Out of stock' : 'Add to cart'}
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
