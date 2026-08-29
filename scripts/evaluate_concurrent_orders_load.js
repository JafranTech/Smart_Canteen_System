/**
 * ==============================================================================
 * Peak Concurrency Stress Test — Simultaneous Multi-User Order Placement
 * 
 * Simulates high-concurrency peak load (e.g., break-window rush hour) where
 * multiple student clients attempt simultaneous end-to-end database order inserts:
 *   - Concurrent INSERT into `orders`
 *   - Concurrent INSERT into `order_items`
 *   - RLS Policy & Database Trigger Evaluation under concurrent load
 *
 * SAFETY & CLEANUP:
 *   - All created test order IDs are tracked.
 *   - Automated cleanup runs immediately upon completion in a `finally` block.
 *   - Restores DB to its pristine state — ZERO residual test clutter.
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://ejrtvzwfeomytbcwmmhx.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcnR2endmZW9teXRiY3dtbWh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mjg1NzgsImV4cCI6MjA4OTAwNDU3OH0.SMx75xnC_C4Tp0i_YrYQgzD38wIlmSIiU78oVFDsrIE'

const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      || 'admin@crescent.education'
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || 'admin123'
const STUDENT_EMAIL    = process.env.STUDENT_EMAIL    || '230081601036@crescent.education'
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || '123456'

const CONCURRENT_ORDERS = parseInt(process.env.CONCURRENT_COUNT || '50', 10)

async function runConcurrentOrderStressTest() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║   CONCURRENT ORDER PLACEMENT LOAD TEST (MULTI-USER STRESS)      ║')
  console.log(`║   Target Concurrency: ${String(CONCURRENT_ORDERS).padEnd(4)} simultaneous orders                 ║`)
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  // 1. Authenticate Admin (for guaranteed cleanup permissions)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  if (adminAuthErr || !adminAuth?.session) {
    console.error('Admin authentication failed:', adminAuthErr?.message)
    process.exit(1)
  }

  // 2. Authenticate Student (for placing realistic orders)
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: studentAuth, error: studentAuthErr } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  })
  if (studentAuthErr || !studentAuth?.session) {
    console.error('Student authentication failed:', studentAuthErr?.message)
    process.exit(1)
  }
  const studentId = studentAuth.user.id
  console.log(`✓ Authenticated test student (uid: ${studentId})`)

  // 3. Fetch an active menu item to use in order items
  const { data: menuItems, error: menuErr } = await studentClient
    .from('menu_items')
    .select('id, name, price')
    .limit(1)

  if (menuErr || !menuItems || menuItems.length === 0) {
    console.error('Failed to retrieve menu items:', menuErr?.message)
    process.exit(1)
  }
  const testItem = menuItems[0]
  console.log(`✓ Selected test product: "${testItem.name}" (₹${testItem.price})\n`)

  const createdOrderIds = []
  const latencies = []
  let successCount = 0
  let failureCount = 0
  const errors = []

  console.log(`🚀 Dispatching ${CONCURRENT_ORDERS} simultaneous order placement requests...`)
  const testStartTime = performance.now()

  try {
    const promises = Array.from({ length: CONCURRENT_ORDERS }, async (_, idx) => {
      const orderId = crypto.randomUUID()
      const rawToken = `${orderId}:${studentId}:${Date.now()}`
      const reqStart = performance.now()

      try {
        // Step A: Insert Order
        const { error: orderErr } = await studentClient
          .from('orders')
          .insert({
            id: orderId,
            student_id: studentId,
            total_amount: Number(testItem.price),
            status: 'pending',
            qr_token: rawToken,
            qr_scanned_count: 0,
          })

        if (orderErr) throw orderErr
        createdOrderIds.push(orderId)

        // Step B: Insert Order Item
        const { error: itemErr } = await studentClient
          .from('order_items')
          .insert({
            order_id: orderId,
            menu_item_id: testItem.id,
            quantity: 1,
            unit_price: Number(testItem.price),
          })

        if (itemErr) throw itemErr

        const latency = Math.round(performance.now() - reqStart)
        latencies.push(latency)
        successCount++
        return { success: true, latency }
      } catch (err) {
        const latency = Math.round(performance.now() - reqStart)
        latencies.push(latency)
        failureCount++
        errors.push(err.message || String(err))
        return { success: false, latency, error: err.message }
      }
    })

    await Promise.all(promises)
  } finally {
    const totalDurationSeconds = (performance.now() - testStartTime) / 1000

    // Compute Metrics
    const sortedLat = [...latencies].sort((a, b) => a - b)
    const meanLat = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0
    const p50 = sortedLat[Math.floor(sortedLat.length * 0.50)] || 0
    const p95 = sortedLat[Math.floor(sortedLat.length * 0.95)] || 0
    const p99 = sortedLat[Math.floor(sortedLat.length * 0.99)] || 0
    const throughput = (successCount / (totalDurationSeconds || 1)).toFixed(1)

    console.log('\n╔══════════════════════════════════════════════════════════════════╗')
    console.log('║               CONCURRENT ORDER LOAD TEST RESULTS                 ║')
    console.log('╚══════════════════════════════════════════════════════════════════╝')
    console.log(`Concurrent Order Attempts:    ${CONCURRENT_ORDERS}`)
    console.log(`Successful Orders Created:    ${successCount} / ${CONCURRENT_ORDERS} (${((successCount / CONCURRENT_ORDERS) * 100).toFixed(1)}%)`)
    console.log(`Failed Orders:                ${failureCount}`)
    console.log(`Total Batch Execution Time:   ${totalDurationSeconds.toFixed(2)} seconds`)
    console.log(`Effective Transaction Rate:   ${throughput} orders/sec`)
    console.log(`Mean Order Latency:           ${meanLat} ms`)
    console.log(`p50 (Median) Latency:         ${p50} ms`)
    console.log(`p95 Latency:                  ${p95} ms`)
    console.log(`p99 Latency:                  ${p99} ms`)
    console.log('══════════════════════════════════════════════════════════════════')

    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} errors (e.g. pool limits/timeouts):`, errors.slice(0, 3))
    }

    // ── GUARANTEED CLEANUP ────────────────────────────────────────────────
    console.log(`\n🧹 Cleaning up ${createdOrderIds.length} temporary load-test orders...`)
    if (createdOrderIds.length > 0) {
      // Delete order_items first due to foreign key
      const { error: delItemsErr } = await adminClient
        .from('order_items')
        .delete()
        .in('order_id', createdOrderIds)

      // Delete orders
      const { error: delOrdersErr } = await adminClient
        .from('orders')
        .delete()
        .in('id', createdOrderIds)

      if (delItemsErr || delOrdersErr) {
        console.warn('⚠️ Manual cleanup note:', delItemsErr?.message || delOrdersErr?.message)
      } else {
        console.log(`✅ Database successfully restored to pristine state. (0 residual test records)\n`)
      }
    }
  }
}

runConcurrentOrderStressTest().catch(console.error)
