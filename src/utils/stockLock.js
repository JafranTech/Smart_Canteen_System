import { supabase } from '../lib/supabase'

// ─── Lock Stock on Order Placement ───────────────────────────
// Decrements stock_quantity for each cart item via DB RPC.
export async function lockStock(cartItems) {
  try {
    for (const item of cartItems) {
      const { error } = await supabase.rpc('decrement_stock', {
        item_id: item.id,
        qty:     item.quantity,
      })
      if (error) throw error
    }
  } catch (err) {
    console.error('[stockLock] lockStock failed:', err)
    throw new Error('Something went wrong. Please try again.')
  }
}

// ─── Release Stock on Cancel / Payment Failure ───────────────
export async function releaseStock(cartItems) {
  try {
    for (const item of cartItems) {
      const { error } = await supabase.rpc('increment_stock', {
        item_id: item.id,
        qty:     item.quantity,
      })
      if (error) throw error
    }
  } catch (err) {
    console.error('[stockLock] releaseStock failed:', err)
    throw new Error('Something went wrong. Please try again.')
  }
}
