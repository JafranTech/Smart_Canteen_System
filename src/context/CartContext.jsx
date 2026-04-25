import { createContext, useContext, useReducer, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────
const MAX_CART_ITEMS = 10

// ─── Context ──────────────────────────────────────────────────
const CartContext = createContext(null)

// ─── Reducer ─────────────────────────────────────────────────
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.item.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.item.id
              ? { ...i, quantity: Math.min(i.quantity + 1, action.item.stock_quantity) }
              : i
          ),
        }
      }
      if (state.items.length >= MAX_CART_ITEMS) return state
      return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] }
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.id) }

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.id !== action.id) }
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      }
    }

    case 'CLEAR_CART':
      return { items: [] }

    default:
      return state
  }
}

// ─── Cart Provider ────────────────────────────────────────────
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const addItem       = useCallback((item) => dispatch({ type: 'ADD_ITEM', item }), [])
  const removeItem    = useCallback((id)   => dispatch({ type: 'REMOVE_ITEM', id }), [])
  const updateQty     = useCallback((id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', id, quantity }), [])
  const clearCart     = useCallback(()    => dispatch({ type: 'CLEAR_CART' }), [])

  const itemCount  = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const value = {
    items: state.items,
    itemCount,
    totalPrice,
    addItem,
    removeItem,
    updateQty,
    clearCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────
export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
