import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { lockStock, releaseStock } from '../utils/stockLock'

// ─── Place Order (Legacy / Direct fallback with pending status) ──
export async function placeOrder(studentId, cartItems, total) {
  try {
    const orderId  = crypto.randomUUID()
    const rawToken = `${orderId}:${studentId}:${Date.now()}`

    // 1. Lock Stock First
    await lockStock(cartItems)

    try {
      // 2. Insert order (triggers enforce status='pending' and qr_scanned_count=0)
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id:               orderId,
          student_id:       studentId,
          total_amount:     total,
          status:           'pending',
          qr_token:         rawToken,
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

      return { orderId, qrToken: rawToken }
    } catch (dbError) {
      // If DB insert fails after stock was locked, release it back
      console.error('[useOrders] DB insert failed, releasing stock:', dbError)
      await releaseStock(cartItems)
      throw dbError
    }

  } catch (err) {
    console.error('[useOrders] placeOrder failed:', err)
    throw err instanceof Error ? err : new Error('Something went wrong. Please try again.')
  }
}

// ─── Fetch Order History (With Realtime Sync) ─────────────────
export function useOrderHistory(studentId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!studentId) return

    let channel = null
    try {
      channel = supabase
        .channel(`student_orders_${studentId}_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `student_id=eq.${studentId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ['orders', 'history', studentId] })
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[useOrders] Realtime channel error for student orders, falling back to polling.')
          }
        })
    } catch (err) {
      console.warn('[useOrders] Could not subscribe to realtime channel:', err?.message)
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {})
      }
    }
  }, [studentId, queryClient])

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

// ─── Fetch Active Orders (Staff with Realtime Sync) ───────────
export function useActiveOrders() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let channel = null
    try {
      channel = supabase
        .channel(`staff_active_orders_realtime_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          queryClient.invalidateQueries({ queryKey: ['orders', 'active'] })
          queryClient.invalidateQueries({ queryKey: ['active_orders'] })
          queryClient.invalidateQueries({ queryKey: ['active_orders_count'] })
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[useOrders] Realtime channel error for active orders.')
          }
        })
    } catch (err) {
      console.warn('[useOrders] Could not subscribe to active orders channel:', err?.message)
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {})
      }
    }
  }, [queryClient])

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
