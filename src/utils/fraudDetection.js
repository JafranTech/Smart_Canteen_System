import { supabase } from '../lib/supabase.js'

/**
 * Logs a detected fraud attempt to the database.
 * @param {string|null} orderId - The ID of the order involved (optional/null if totally invalid token)
 * @param {string} reason - The specific fraud reason enum ('duplicate_scan', 'invalid_qr', 'expired_order')
 * @param {string} staffId - The ID of the staff member who scanned the code
 * @param {string|null} notes - Additional context if needed
 */
export async function logFraudAttempt(orderId, reason, staffId, notes = null) {
  try {
    const { error } = await supabase
      .from('fraud_logs')
      .insert({
        order_id: orderId,
        reason: reason,
        scanned_by: staffId,
        notes: notes
      })

    if (error) {
      console.error('[fraudDetection] Failed to log fraud attempt:', error)
    }
  } catch (err) {
    console.error('[fraudDetection] Exception while logging fraud:', err)
  }
}
