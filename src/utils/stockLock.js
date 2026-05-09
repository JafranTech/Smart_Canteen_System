import { supabase } from '../lib/supabase'

// ─── Lock Stock on Order Placement ───────────────────────────
// Decrements stock_quantity via DB RPC.
// The DB function enforces daily limit and raises an exception if stock runs out.
export async function lockStock(cartItems) {
  for (const item of cartItems) {
    const { error } = await supabase.rpc('decrement_stock', {
      item_id: item.id,
      qty:     item.quantity,
    })

    if (error) {
      console.error('[stockLock] lockStock failed:', error)
      // The DB raises a friendly exception string — surface it to the user
      if (error.message?.toLowerCase().includes('not enough stock')) {
        throw new Error(`"${item.name}" is now sold out for today. Please remove it from your cart.`)
      }
      throw new Error('Something went wrong placing your order. Please try again.')
    }
  }
}

// ─── Release Stock on Cancel / Payment Failure ───────────────
// Called if DB insert fails after lockStock succeeded.
export async function releaseStock(cartItems) {
  for (const item of cartItems) {
    const { error } = await supabase.rpc('increment_stock', {
      item_id: item.id,
      qty:     item.quantity,
    })

    if (error) {
      console.error('[stockLock] releaseStock failed:', error)
      // Non-critical — stock will naturally reset at midnight
    }
  }
}
