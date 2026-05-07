import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { encryptToken } from '../utils/qrTokens'
import { lockStock, releaseStock } from '../utils/stockLock'

// ─── Place Order ──────────────────────────────────────────────
export async function placeOrder(studentId, cartItems, total) {
  try {
    const orderId  = crypto.randomUUID()
    const rawToken = `${orderId}:${studentId}:${Date.now()}`
    const qrToken  = encryptToken(rawToken)

    // 1. Lock Stock First
    await lockStock(cartItems)

    try {
      // 2. Insert order
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id:               orderId,
          student_id:       studentId,
          total_amount:     total,
          status:           'paid',
          qr_token:         qrToken,
          qr_scanned_count: 0,
        })
      if (orderError) throw orderError

      // 3. Insert order items
      const items = cartItems.map(item => ({
        order_id:     orderId,
        menu_item_id: item.id,
        quantity:     item.quantity,
        unit_price:   item.price,
      }))
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items)
      if (itemsError) throw itemsError

      return { orderId, qrToken }
    } catch (dbError) {
      // If DB insert fails, release the stock we locked
      console.error('[useOrders] DB insert failed, releasing stock...', dbError)
      await releaseStock(cartItems)
      throw dbError
    }

  } catch (err) {
    console.error('[useOrders] placeOrder failed:', err)
    throw new Error('Something went wrong. Please try again.')
  }
}

// ─── Fetch Order History ──────────────────────────────────────
export function useOrderHistory(studentId) {
  return useQuery({
    queryKey: ['orders', 'history', studentId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name, image_url))')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
        if (error) throw error
        return data
      } catch (err) {
        console.error('[useOrders] fetchHistory failed:', err)
        throw new Error('Unable to load order history.')
      }
    },
    enabled: !!studentId,
  })
}

// ─── Fetch Order By ID ────────────────────────────────────────
export function useOrderById(orderId) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name))')
          .eq('id', orderId)
          .single()
        if (error) throw error
        return data
      } catch (err) {
        console.error('[useOrders] fetchById failed:', err)
        throw new Error('Unable to load order details.')
      }
    },
    enabled: !!orderId,
  })
}

// ─── Fetch Active Orders (Staff) ──────────────────────────────
export function useActiveOrders() {
  return useQuery({
    queryKey: ['orders', 'active'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles!orders_student_id_fkey(name, college_id), order_items(*, menu_items(name))')
          .in('status', ['paid', 'ready'])
          .order('created_at', { ascending: false })
        
        if (error) throw error
        return data
      } catch (err) {
        console.error('[useOrders] fetchActiveOrders failed:', err)
        throw new Error('Unable to load active orders.')
      }
    }
  })
}
