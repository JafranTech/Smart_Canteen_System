import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { decryptToken } from '../utils/qrTokens.js'
import { logFraudAttempt } from '../utils/fraudDetection.js'

export function useQR() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDelivering, setIsDelivering] = useState(false)

  const verifyQR = useCallback(async (token, staffId) => {
    setIsVerifying(true)
    try {
      const trimmed = token.trim()
      // 1. Decrypt token structure
      const decrypted = decryptToken(trimmed)
      
      let queryCol = 'qr_token'
      let queryVal = trimmed
      let isShortId = false

      if (!decrypted) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
        const isShort = /^[a-zA-Z0-9]{8}$/i.test(trimmed)
        
        if (isUUID) {
          queryCol = 'id'
          queryVal = trimmed
        } else if (isShort) {
          isShortId = true
        } else {
          if (staffId) await logFraudAttempt(null, 'invalid_qr', staffId, 'Token decryption failed')
          return { valid: false, reason: 'invalid_qr' }
        }
      }

      let order = null
      let error = null

      // 2. Fetch the order
      if (isShortId) {
        // Fallback for short ID: fetch active orders and filter in JS
        const { data: activeOrders, error: activeErr } = await supabase
          .from('orders')
          .select(`
            *,
            profiles (full_name, email),
            order_items (
              quantity,
              unit_price,
              menu_items (name, image_url)
            )
          `)
          .in('status', ['paid', 'ready', 'collected'])
          .order('created_at', { ascending: false })
          .limit(200)
          
        error = activeErr
        if (activeOrders) {
          order = activeOrders.find(o => o.id.toLowerCase().startsWith(trimmed.toLowerCase()))
        }
      } else {
        const { data: fetchedOrder, error: fetchErr } = await supabase
          .from('orders')
          .select(`
            *,
            profiles (full_name, email),
            order_items (
              quantity,
              unit_price,
              menu_items (name, image_url)
            )
          `)
          .eq(queryCol, queryVal)
          .single()
          
        order = fetchedOrder
        error = fetchErr
      }

      if (error || !order) {
        if (staffId) await logFraudAttempt(decrypted || trimmed, 'invalid_qr', staffId, 'Order not found for token')
        return { valid: false, reason: 'invalid_qr' }
      }

      // 3. Fraud / logic bounds
      if (order.status === 'collected') {
        if (staffId) await logFraudAttempt(order.id, 'duplicate_scan', staffId, 'Order already collected')
        return { valid: false, reason: 'duplicate_scan', order }
      }
      
      if (order.qr_scanned_count >= 1) {
        if (staffId) await logFraudAttempt(order.id, 'duplicate_scan', staffId, 'Scanned count >= 1')
        return { valid: false, reason: 'duplicate_scan', order }
      }

      // Check expired (orders expire after ORDER_EXPIRY_HOURS)
      const ORDER_EXPIRY_HOURS = 4
      const orderDate = new Date(order.created_at)
      const now = new Date()
      const diffHours = (now - orderDate) / (1000 * 60 * 60)
      if (diffHours > ORDER_EXPIRY_HOURS) {
        if (staffId) await logFraudAttempt(order.id, 'expired_order', staffId, `Order is ${Math.round(diffHours)} hours old`)
        return { valid: false, reason: 'expired_order', order }
      }

      if (order.status !== 'paid' && order.status !== 'ready') {
        if (staffId) await logFraudAttempt(order.id, 'invalid_qr', staffId, `Invalid status: ${order.status}`)
        return { valid: false, reason: 'invalid_qr' }
      }

      return { valid: true, order }
    } catch (err) {
      console.error('[useQR] verifyQR failed:', err)
      return { valid: false, reason: 'invalid_qr' }
    } finally {
      setIsVerifying(false)
    }
  }, [])

  const deliverOrder = useCallback(async (orderId) => {
    setIsDelivering(true)
    try {
      // Update status to 'collected' and qr_scanned_count to 1
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: 'collected', 
          qr_scanned_count: 1 
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (err) {
      console.error('[useQR] deliverOrder failed:', err)
      throw new Error('Something went wrong finishing delivery.')
    } finally {
      setIsDelivering(false)
    }
  }, [])

  return { verifyQR, deliverOrder, isVerifying, isDelivering }
}
