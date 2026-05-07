import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { decryptToken } from '../utils/qrTokens.js'
import { logFraudAttempt } from '../utils/fraudDetection.js'

// ─── Constants ───────────────────────────────────────────────
const ORDER_EXPIRY_HOURS = 4

// ─── Shared select string ────────────────────────────────────
// profiles column is 'name' per DB schema (not full_name)
const ORDER_SELECT = `
  *,
  profiles!orders_student_id_fkey (name, college_id),
  order_items (
    quantity,
    unit_price,
    menu_items (name, image_url)
  )
`

export function useQR() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDelivering, setIsDelivering] = useState(false)

  const verifyQR = useCallback(async (scannedToken, staffId) => {
    setIsVerifying(true)
    try {
      const trimmed = scannedToken.trim()

      // ── Step 1: Decrypt the encrypted QR token
      // Expected decrypted format: "{orderId}:{studentId}:{timestamp}"
      const decrypted = decryptToken(trimmed)

      let queryCol = 'qr_token'
      let queryVal = trimmed
      let orderId   = null  // extracted from decrypted payload
      let isShortId = false

      if (decrypted) {
        // Successfully decrypted — extract orderId from payload
        const parts = decrypted.split(':')
        if (parts.length >= 1 && parts[0]) {
          orderId  = parts[0]
          queryCol = 'id'
          queryVal = orderId
        } else {
          // Decrypted but malformed payload
          if (staffId) await logFraudAttempt(null, 'invalid_qr', staffId, 'Decrypted payload malformed')
          return { valid: false, reason: 'invalid_qr' }
        }
      } else {
        // Decryption failed — check if it is a raw UUID or short display ID
        const isUUID  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
        const isShort = /^[a-zA-Z0-9]{8}$/i.test(trimmed)

        if (isUUID) {
          queryCol = 'id'
          queryVal = trimmed
        } else if (isShort) {
          isShortId = true
        } else {
          if (staffId) await logFraudAttempt(null, 'invalid_qr', staffId, 'Token decryption failed — not UUID or short ID')
          return { valid: false, reason: 'invalid_qr' }
        }
      }

      // ── Step 2: Fetch the order from Supabase
      let order = null
      let error = null

      if (isShortId) {
        // Fallback: fetch recent active orders and match by ID prefix
        const { data: activeOrders, error: activeErr } = await supabase
          .from('orders')
          .select(ORDER_SELECT)
          .in('status', ['paid', 'ready', 'collected'])
          .order('created_at', { ascending: false })
          .limit(200)

        error = activeErr
        if (activeOrders) {
          order = activeOrders.find((o) => o.id.toLowerCase().startsWith(trimmed.toLowerCase())) || null
        }
      } else {
        const { data: fetchedOrder, error: fetchErr } = await supabase
          .from('orders')
          .select(ORDER_SELECT)
          .eq(queryCol, queryVal)
          .single()

        order = fetchedOrder
        error  = fetchErr
      }

      if (error || !order) {
        if (staffId) await logFraudAttempt(null, 'invalid_qr', staffId, 'Order not found for token')
        return { valid: false, reason: 'invalid_qr' }
      }

      // ── Step 3: Validate order state (fraud / logic bounds)
      if (order.status === 'collected') {
        if (staffId) await logFraudAttempt(order.id, 'duplicate_scan', staffId, 'Order already collected')
        return { valid: false, reason: 'duplicate_scan', order }
      }

      if (order.qr_scanned_count >= 1) {
        if (staffId) await logFraudAttempt(order.id, 'duplicate_scan', staffId, 'Scanned count >= 1')
        return { valid: false, reason: 'duplicate_scan', order }
      }

      // Expiry check
      const orderDate = new Date(order.created_at)
      const diffHours = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60)
      if (diffHours > ORDER_EXPIRY_HOURS) {
        if (staffId) await logFraudAttempt(order.id, 'expired_order', staffId, `Order is ${Math.round(diffHours)}h old`)
        return { valid: false, reason: 'expired_order', order }
      }

      if (order.status !== 'paid' && order.status !== 'ready') {
        if (staffId) await logFraudAttempt(order.id, 'invalid_qr', staffId, `Invalid status: ${order.status}`)
        return { valid: false, reason: 'invalid_qr', order }
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
