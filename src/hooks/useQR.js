import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useQR() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDelivering, setIsDelivering] = useState(false)

  const verifyQR = useCallback(async (scannedToken, staffId) => {
    setIsVerifying(true)
    try {
      const trimmed = (scannedToken || '').trim()
      if (!trimmed) {
        return { valid: false, reason: 'invalid_qr' }
      }

      // Invoke server-side Edge Function for secure verification and fraud logging
      const { data, error } = await supabase.functions.invoke('verify-qr', {
        body: { token: trimmed, staffId },
      })

      if (error) {
        console.error('[useQR] verify-qr function error:', error)
        return { valid: false, reason: data?.reason || 'invalid_qr' }
      }

      return data || { valid: false, reason: 'invalid_qr' }
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
      throw new Error(err.message || 'Something went wrong finishing delivery.')
    } finally {
      setIsDelivering(false)
    }
  }, [])

  return { verifyQR, deliverOrder, isVerifying, isDelivering }
}
