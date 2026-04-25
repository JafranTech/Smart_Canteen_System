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
      // 1. Decrypt token structure
      const decrypted = decryptToken(token)
      if (!decrypted) {
        if (staffId) await logFraudAttempt(null, 'invalid_qr', staffId, 'Token decryption failed')
        return { valid: false, reason: 'invalid_qr' }
      }

      // 2. Fetch the order corresponding to the QR Token
      const { data: order, error } = await supabase
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
        .eq('qr_token', token)
        .single()

      if (error || !order) {
        if (staffId) await logFraudAttempt(decrypted, 'invalid_qr', staffId, 'Order not found for token')
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

      // Check expired (e.g., > 12 hours)
      const orderDate = new Date(order.created_at)
      const now = new Date()
      const diffHours = (now - orderDate) / (1000 * 60 * 60)
      if (diffHours > 12) {
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
