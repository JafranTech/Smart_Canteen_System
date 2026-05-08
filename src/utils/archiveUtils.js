import { supabase } from '../lib/supabase.js'

// ─── Constants ────────────────────────────────────────────────
// HARD SAFETY RULE: Only ever delete orders with this status.
// This constant must NEVER be changed or parameterised.
const SAFE_DELETE_STATUS = 'collected'

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Parses a "yyyy-MM-dd" date string into a local-midnight Date object.
 * Using new Date("yyyy-MM-dd") would parse as UTC and cause timezone drift.
 */
function parseDateLocal(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)   // month is 0-indexed
}

/** Returns start-of-day and end-of-day ISO strings for a date range */
function getRangeBounds(fromDateStr, toDateStr) {
  const start = parseDateLocal(fromDateStr)
  start.setHours(0, 0, 0, 0)

  const end = parseDateLocal(toDateStr)
  end.setHours(23, 59, 59, 999)

  return { start: start.toISOString(), end: end.toISOString() }
}

/** Returns start-of-day and end-of-day ISO strings for a given Date object */
function getDayBounds(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

// ─── Fetch for Export ─────────────────────────────────────────

/**
 * Fetches all collected orders within a date range, with full join data.
 * Accepts date strings ("yyyy-MM-dd") to avoid UTC-parsing timezone bugs.
 *
 * @param {string} fromDateStr - "yyyy-MM-dd"
 * @param {string} toDateStr   - "yyyy-MM-dd"
 * @returns {Promise<Object[]>} Array of order rows with profiles + order_items
 */
export async function fetchOrdersForExport(fromDateStr, toDateStr) {
  const { start, end } = getRangeBounds(fromDateStr, toDateStr)

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:student_id (name, email, college_id),
        order_items (
          quantity,
          unit_price,
          menu_items (name)
        )
      `)
      .eq('status', SAFE_DELETE_STATUS)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('[archiveUtils] fetchOrdersForExport failed:', err)
    throw new Error('Unable to load orders for export. Please try again.')
  }
}

/**
 * Fetches a count summary for today's orders (all statuses) + collected only.
 * Used by the stats strip in ExportPanel.
 *
 * @returns {Promise<{ totalToday: number, collectedToday: number, revenueToday: number }>}
 */
export async function fetchTodayStats() {
  const { start, end } = getDayBounds(new Date())

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount')
      .gte('created_at', start)
      .lte('created_at', end)

    if (error) throw error

    const all       = data ?? []
    const collected = all.filter((o) => o.status === SAFE_DELETE_STATUS)
    const revenue   = collected.reduce((sum, o) => sum + Number(o.total_amount), 0)

    return {
      totalToday:     all.length,
      collectedToday: collected.length,
      revenueToday:   revenue,
    }
  } catch (err) {
    console.error('[archiveUtils] fetchTodayStats failed:', err)
    throw new Error("Unable to load today's stats.")
  }
}

// ─── Archive (Delete) ─────────────────────────────────────────

/**
 * Permanently deletes collected orders (and their items) within a date range.
 * Accepts date strings ("yyyy-MM-dd") to avoid UTC-parsing timezone bugs.
 *
 * SAFETY INVARIANTS — must never be violated:
 *  1. Only deletes rows where status = 'collected'
 *  2. Never touches fraud_logs, profiles, or menu_items
 *  3. Deletes order_items before orders (explicit, not relying on cascade)
 *  4. Returns { deletedCount } so callers can show accurate success messages
 *
 * @param {string} fromDateStr - "yyyy-MM-dd"
 * @param {string} toDateStr   - "yyyy-MM-dd"
 * @returns {Promise<{ deletedCount: number }>}
 */
export async function archiveCollectedOrders(fromDateStr, toDateStr) {
  const { start, end } = getRangeBounds(fromDateStr, toDateStr)

  try {
    // Step 1: Fetch the IDs of collected orders in range (scope the delete precisely)
    const { data: targets, error: fetchErr } = await supabase
      .from('orders')
      .select('id')
      .eq('status', SAFE_DELETE_STATUS)          // ← HARDCODED SAFETY GUARD
      .gte('created_at', start)
      .lte('created_at', end)

    if (fetchErr) throw fetchErr
    if (!targets || targets.length === 0) {
      return { deletedCount: 0 }
    }

    const orderIds = targets.map((o) => o.id)

    // Step 2: Delete order_items first (child rows)
    const { error: itemsErr } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds)

    if (itemsErr) throw itemsErr

    // Step 3: Delete the orders themselves
    const { error: ordersErr } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds)
      .eq('status', SAFE_DELETE_STATUS)          // ← DOUBLE SAFETY GUARD

    if (ordersErr) throw ordersErr

    return { deletedCount: orderIds.length }
  } catch (err) {
    console.error('[archiveUtils] archiveCollectedOrders failed:', err)
    throw new Error('Archive failed. No data was deleted. Please try again.')
  }
}

// ─── Storage Size ─────────────────────────────────────────────

/**
 * Fetches the estimated database size in MB via a Supabase RPC function.
 * Requires the get_db_size_mb() function to be created in Supabase SQL editor.
 *
 * @returns {Promise<number>} Size in MB, rounded to 2 decimal places
 */
export async function fetchDbSizeMb() {
  try {
    const { data, error } = await supabase.rpc('get_db_size_mb')
    if (error) throw error
    return Number(data) ?? 0
  } catch (err) {
    console.error('[archiveUtils] fetchDbSizeMb failed:', err)
    return null   // null = unable to read, caller hides the widget gracefully
  }
}
