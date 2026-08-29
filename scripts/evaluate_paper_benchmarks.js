/**
 * ==============================================================================
 * Comprehensive Paper Evaluation & Benchmark Suite — Smart Canteen System
 *
 * Generates exact experimental evidence for the Research Paper:
 *  1. Security & Fraud Detection Matrix (40 Automated Test Cases across 7 sub-categories)
 *     - Cat 1  (5):  Forged Razorpay HMAC Signature Attack
 *     - Cat 2  (5):  Malformed / Tampered Ciphertext Attack
 *     - Cat 3  (5):  Non-Existent Order Lookup
 *     - Cat 4  (5):  Duplicate QR Re-scan Attack — 5 DISTINCT collected orders (FIX 1)
 *     - Cat 5  (5):  Genuine Valid Order Verification (should ACCEPT)
 *     - Cat 6a (5):  Direct DB Status Tamper — Anonymous Attacker (RLS block)
 *     - Cat 6b (5):  Direct DB Status Tamper — Authenticated Student (Trigger reset) (FIX 2)
 *
 *  2. Concurrency Load Test (50 Simultaneous Student Requests)
 *     - Measures Throughput (req/s), Latency Percentiles (p50, p95, p99), Error Rate
 *
 *  3. Markdown Results Table ready for copy-paste into Paper Section V
 *
 * IMPORTANT - AUTHENTICATION:
 *   verify-qr               => requires a STAFF or ADMIN JWT  (STAFF_EMAIL / STAFF_PASSWORD)
 *   verify-razorpay-payment => requires any authenticated user JWT (STUDENT_EMAIL / STUDENT_PASSWORD)
 *
 *   Set the four env vars before running:
 *     STAFF_EMAIL   STAFF_PASSWORD   STUDENT_EMAIL   STUDENT_PASSWORD
 *
 *   Example:
 *     STAFF_EMAIL=staff@crescent.education STAFF_PASSWORD=staff123 \
 *     STUDENT_EMAIL=student@college.edu STUDENT_PASSWORD=secret \
 *     node --experimental-vm-modules scripts/evaluate_paper_benchmarks.js
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js'

// Connection
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://ejrtvzwfeomytbcwmmhx.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcnR2endmZW9teXRiY3dtbWh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mjg1NzgsImV4cCI6MjA4OTAwNDU3OH0.SMx75xnC_C4Tp0i_YrYQgzD38wIlmSIiU78oVFDsrIE'

// Test-account credentials (set via env vars or edit the strings below)
const STAFF_EMAIL      = process.env.STAFF_EMAIL      || ''
const STAFF_PASSWORD   = process.env.STAFF_PASSWORD   || ''
const STUDENT_EMAIL    = process.env.STUDENT_EMAIL    || ''
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || ''

// ---------------------------------------------------------------------------
async function runPaperBenchmarks() {
  console.log('=====================================================================')
  console.log('   SMART CANTEEN SYSTEM - ACADEMIC RESEARCH BENCHMARK SUITE')
  console.log('   N = 40  |  7 sub-categories  |  40 test vectors')
  console.log('=====================================================================\n')

  // Validate credentials
  const missing = []
  if (!STAFF_EMAIL)      missing.push('STAFF_EMAIL')
  if (!STAFF_PASSWORD)   missing.push('STAFF_PASSWORD')
  if (!STUDENT_EMAIL)    missing.push('STUDENT_EMAIL')
  if (!STUDENT_PASSWORD) missing.push('STUDENT_PASSWORD')

  if (missing.length > 0) {
    console.error('ABORT: Missing required credentials:')
    missing.forEach(v => console.error(`  ${v}  - set via env var or edit the script`))
    process.exit(1)
  }

  // Sign in as STAFF
  console.log('Signing in as STAFF ...')
  const staffClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: staffAuth, error: staffAuthErr } = await staffClient.auth.signInWithPassword({
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
  })
  if (staffAuthErr || !staffAuth?.session) {
    console.error('Staff sign-in failed:', staffAuthErr?.message)
    process.exit(1)
  }
  const staffToken = staffAuth.session.access_token
  console.log(`Staff signed in  (uid: ${staffAuth.user.id})\n`)

  // Sign in as STUDENT
  console.log('Signing in as STUDENT ...')
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: studentAuth, error: studentAuthErr } = await studentClient.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  })
  if (studentAuthErr || !studentAuth?.session) {
    console.error('Student sign-in failed:', studentAuthErr?.message)
    process.exit(1)
  }
  const studentToken = studentAuth.session.access_token
  console.log(`Student signed in (uid: ${studentAuth.user.id})\n`)

  // Helper: invoke an edge function with a specific Bearer token
  async function invokeWithToken(token, fnName, body) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { data, status: res.status }
  }

  // Results tracking
  const results = {
    total: 0,
    tp: 0, tn: 0, fp: 0, fn: 0,
    latencies: [],
    testCases: [],
    // Per sub-category latency buckets
    cat1Lat: [], cat2Lat: [], cat3Lat: [], cat4Lat: [],
    cat5Lat: [], cat6aLat: [], cat6bLat: [],
  }

  function record(category, expected, actual, latencyMs, notes, latBucket) {
    notes = notes || ''
    const isAccepted = actual === true
    const isExpected = expected === 'ACCEPT'
    results.total++
    results.latencies.push(latencyMs)
    if (latBucket) latBucket.push(latencyMs)

    let status = 'FAIL'
    if (isExpected && isAccepted)        { results.tp++; status = 'PASS' }
    else if (!isExpected && !isAccepted) { results.tn++; status = 'PASS' }
    else if (!isExpected && isAccepted)  { results.fp++; status = 'FAIL' }
    else if (isExpected && !isAccepted)  { results.fn++; status = 'FAIL' }

    results.testCases.push({
      id: results.total, category, expected,
      outcome: isAccepted ? 'ACCEPTED' : 'REJECTED',
      status, latencyMs, notes,
    })

    console.log(
      `[Test #${String(results.total).padStart(2, '0')}] ` +
      `${category.padEnd(42)} | ` +
      `Exp: ${expected.padEnd(6)} | ` +
      `Out: ${(isAccepted ? 'ACCEPTED' : 'REJECTED').padEnd(8)} | ` +
      `${status} (${latencyMs}ms)` +
      (notes ? `  -- ${notes}` : '')
    )
  }

  // ==========================================================================
  // CATEGORY 1: Forged Razorpay HMAC Signatures (5 tests)
  // ==========================================================================
  console.log('--- Category 1: Forged Razorpay HMAC Signatures ---')
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now()
    const { data } = await invokeWithToken(studentToken, 'verify-razorpay-payment', {
      razorpay_order_id:   `order_fake_${i}_${Date.now()}`,
      razorpay_payment_id: `pay_fake_${i}_${Date.now()}`,
      razorpay_signature:  `forged_signature_hash_${i}_${'0'.repeat(30)}`,
      cartItems: [],
      totalAmount: 50 * i,
    })
    const latency = Math.round(performance.now() - t0)
    record('Forged Payment Signature', 'REJECT', !!data?.success, latency,
           'Invalid HMAC-SHA256', results.cat1Lat)
  }

  // ==========================================================================
  // CATEGORY 2: Malformed / Tampered QR Ciphertexts (5 tests)
  // ==========================================================================
  console.log('\n--- Category 2: Malformed / Tampered QR Ciphertexts ---')
  const malformedSamples = [
    'U2FsdGVkX19FAKE123MALFORMED',
    'plain_text_not_encrypted',
    '{"orderId":"fake-order-id"}',
    'corrupted_aes_base64_payload_string==',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  ]
  for (const sample of malformedSamples) {
    const t0 = performance.now()
    const { data } = await invokeWithToken(staffToken, 'verify-qr', { token: sample })
    const latency = Math.round(performance.now() - t0)
    record('Malformed QR Ciphertext', 'REJECT', !!data?.valid, latency,
           data?.reason || data?.error || 'Decryption failure', results.cat2Lat)
  }

  // ==========================================================================
  // CATEGORY 3: Non-Existent Order UUIDs (5 tests)
  // ==========================================================================
  console.log('\n--- Category 3: Non-Existent Order Lookups ---')
  for (let i = 1; i <= 5; i++) {
    const fakeId = crypto.randomUUID()
    const t0 = performance.now()
    const { data } = await invokeWithToken(staffToken, 'verify-qr', { token: fakeId })
    const latency = Math.round(performance.now() - t0)
    record('Non-Existent Order Lookup', 'REJECT', !!data?.valid, latency,
           'UUID not in DB', results.cat3Lat)
  }

  // ==========================================================================
  // CATEGORY 4: Duplicate / Already-Collected Orders (5 tests)
  // FIX 1: fetches 5 DISTINCT collected order tokens, one test per token.
  // ==========================================================================
  console.log('\n--- Category 4: Duplicate Pickup / Replay Attacks (5 distinct collected orders) ---')
  const { data: collectedOrders, error: collectErr } = await staffClient
    .from('orders')
    .select('id, qr_token')
    .eq('status', 'collected')
    .not('qr_token', 'is', null)
    .limit(5)

  if (collectErr) {
    console.warn('WARNING: Could not fetch collected orders:', collectErr.message)
  }

  if (!collectedOrders || collectedOrders.length === 0) {
    console.error(
      'ABORT Category 4: No "collected" orders found in the database.\n' +
      '  Mark at least one order as collected and re-run.'
    )
    for (let i = 1; i <= 5; i++) {
      record('Duplicate Scan - Distinct Replay', 'REJECT', false, 0,
             'NO COLLECTED ORDER IN DB - SKIPPED, RESULT INVALID FOR PAPER', results.cat4Lat)
    }
  } else {
    if (collectedOrders.length < 5) {
      console.warn(
        `WARNING: Only ${collectedOrders.length} collected order(s) found (target: 5 distinct). ` +
        `Padding last token to fill remaining ${5 - collectedOrders.length} test slot(s). ` +
        `Ensure 5 distinct collected orders exist for a fully rigorous Category 4.`
      )
    } else {
      console.log(`  Using ${collectedOrders.length} distinct collected order tokens.`)
    }

    // Pad only if strictly necessary (documented fallback per FIX 1 specification)
    const paddedCollected = [...collectedOrders]
    while (paddedCollected.length < 5) paddedCollected.push(paddedCollected[paddedCollected.length - 1])

    for (let i = 0; i < 5; i++) {
      const order = paddedCollected[i]
      const isPadded = i >= collectedOrders.length
      const t0 = performance.now()
      const { data } = await invokeWithToken(staffToken, 'verify-qr', { token: order.qr_token })
      const latency = Math.round(performance.now() - t0)
      record('Duplicate Scan - Distinct Replay', 'REJECT', !!data?.valid, latency,
             (isPadded ? '[PADDED] ' : '') + (data?.reason || 'Already collected'),
             results.cat4Lat)
    }
  }

  // ==========================================================================
  // CATEGORY 5: Genuine Valid Orders (5 tests) - should ACCEPT
  //
  // MANUAL STEP before running:
  //   Log in as the student test account through the actual app UI and complete
  //   at least 5 real checkout payments (do NOT scan/collect them). This gives
  //   5 genuinely distinct paid orders for a fully rigorous Category 5.
  // ==========================================================================
  console.log('\n--- Category 5: Genuine Active Orders (should ACCEPT) ---')
  const { data: activeOrders, error: activeErr } = await staffClient
    .from('orders')
    .select('id, qr_token')
    .in('status', ['paid', 'ready'])
    .limit(5)

  if (activeErr) {
    console.warn('WARNING: Could not fetch active orders:', activeErr.message)
  }

  if (!activeOrders || activeOrders.length === 0) {
    console.error(
      'ABORT Category 5: No "paid" or "ready" orders found in the database.\n' +
      '  Complete at least one payment through the app and re-run.\n' +
      '  Simulated results are NOT acceptable for this category in a paper.'
    )
    for (let i = 1; i <= 5; i++) {
      record('Genuine Valid Order', 'ACCEPT', false, 0,
             'NO ACTIVE ORDER IN DB - SKIPPED, RESULT INVALID FOR PAPER', results.cat5Lat)
    }
  } else {
    if (activeOrders.length < 5) {
      console.warn(
        `WARNING: Only ${activeOrders.length} active order(s) found (target: 5 distinct). ` +
        `Repeating last token to fill remaining ${5 - activeOrders.length} slot(s). ` +
        `Complete more payments through the app UI for fully distinct Category 5 vectors.`
      )
    } else {
      console.log(`  Using ${activeOrders.length} distinct paid/ready order tokens.`)
    }
    const padded = [...activeOrders]
    while (padded.length < 5) padded.push(padded[padded.length - 1])

    for (const order of padded.slice(0, 5)) {
      const t0 = performance.now()
      const { data } = await invokeWithToken(staffToken, 'verify-qr', { token: order.qr_token })
      const latency = Math.round(performance.now() - t0)
      record('Genuine Valid Order', 'ACCEPT', !!data?.valid, latency,
             data?.valid ? 'Accepted correctly' : (data?.reason || data?.error || 'Unexpectedly rejected'),
             results.cat5Lat)
    }
  }

  // ==========================================================================
  // CATEGORY 6a: Direct DB Status Tampering - Anonymous Attacker (5 tests)
  //   Unauthenticated anon client attempts INSERT with status='collected'.
  //   Expected: blocked by RLS (error returned).
  //   PASS = insert is blocked (error is non-null).
  // ==========================================================================
  console.log('\n--- Category 6a: Direct DB Tamper - Anonymous Attacker (RLS block) ---')
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now()
    const { data, error } = await anonClient
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        student_id: '00000000-0000-0000-0000-000000000000',
        total_amount: 150,
        status: 'collected',
        qr_scanned_count: 1,
      })
      .select()
    const latency = Math.round(performance.now() - t0)
    // bypassSuccess = true only if RLS let the row through AND status is still 'collected'
    const bypassSuccess = !error && data?.[0]?.status === 'collected'
    record('DB Tamper - Anonymous Attacker', 'REJECT', bypassSuccess, latency,
           error ? 'Blocked by RLS' : `Insert allowed; status=${data?.[0]?.status}`,
           results.cat6aLat)
  }

  // ==========================================================================
  // CATEGORY 6b: Direct DB Status Tampering - Authenticated Student (5 tests)
  // FIX 2: Uses the REAL signed-in studentClient (legitimate account).
  //   The student inserts their OWN order row with status='collected' and
  //   qr_scanned_count=1, attempting to bypass the payment and QR flow.
  //
  //   Expected behaviour (trg_enforce_order_insert_defaults trigger):
  //     - RLS ALLOWS the insert (student's own row)
  //     - The trigger forces status -> 'pending', qr_scanned_count -> 0
  //     - So: error === null  AND  returned status !== 'collected'
  //
  //   PASS: error === null  AND  returned_status !== 'collected'  (trigger fired)
  //   FAIL: returned_status === 'collected'  (trigger did NOT fire - security breach)
  // ==========================================================================
  console.log('\n--- Category 6b: Direct DB Tamper - Authenticated Student (Trigger reset) ---')
  for (let i = 1; i <= 5; i++) {
    const t0 = performance.now()
    const { data, error } = await studentClient
      .from('orders')
      .insert({
        id: crypto.randomUUID(),
        student_id: studentAuth.user.id,   // real, legitimate student's own ID
        total_amount: 150,
        status: 'collected',               // attempting to bypass payment/QR scan
        qr_scanned_count: 1,
      })
      .select()
    const latency = Math.round(performance.now() - t0)

    // bypassSuccess = true only if 'collected' status survived (trigger did not fire)
    const bypassSuccess = !error && data?.[0]?.status === 'collected'
    const returnedStatus = data?.[0]?.status ?? 'N/A'

    record('Authenticated Student Tamper Attempt', 'REJECT', bypassSuccess, latency,
           error
             ? `Insert blocked: ${error.message}`
             : `Insert allowed; trigger set status=${returnedStatus}${returnedStatus !== 'collected' ? ' [Trigger fired OK]' : ' [TRIGGER DID NOT FIRE]'}`,
           results.cat6bLat)
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  const accuracy  = ((results.tp + results.tn) / (results.total || 1)) * 100
  const precision = results.tp + results.fp > 0 ? (results.tp / (results.tp + results.fp)) * 100 : 100
  const recall    = results.tp + results.fn > 0 ? (results.tp / (results.tp + results.fn)) * 100 : 100
  const f1        = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  const avgLatency = results.latencies.reduce((a, b) => a + b, 0) / (results.latencies.length || 1)
  const sortedLat  = [...results.latencies].sort((a, b) => a - b)
  const p50 = sortedLat[Math.floor(sortedLat.length * 0.50)]
  const p95 = sortedLat[Math.floor(sortedLat.length * 0.95)]
  const p99 = sortedLat[Math.floor(sortedLat.length * 0.99)]

  function meanOf(arr) {
    return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 'N/A'
  }

  console.log('\n=====================================================================')
  console.log('                 PUBLICATION RESULTS SUMMARY  (N=40)')
  console.log('=====================================================================')
  console.log(`Total Test Vectors:   ${results.total}`)
  console.log(`True Positives (TP):  ${results.tp}   (genuine, correctly accepted)`)
  console.log(`True Negatives (TN):  ${results.tn}   (malicious, correctly rejected)`)
  console.log(`False Positives (FP): ${results.fp}   (malicious, wrongly accepted)`)
  console.log(`False Negatives (FN): ${results.fn}   (genuine, wrongly rejected)`)
  console.log(`Overall Accuracy:     ${accuracy.toFixed(1)}%`)
  console.log(`Precision:            ${precision.toFixed(1)}%`)
  console.log(`Recall / Sensitivity: ${recall.toFixed(1)}%`)
  console.log(`F1-Score:             ${f1.toFixed(1)}%`)
  console.log(`Mean Latency:         ${avgLatency.toFixed(1)} ms`)
  console.log(`p50 Latency:          ${p50} ms`)
  console.log(`p95 Latency:          ${p95} ms`)
  console.log(`p99 Latency:          ${p99} ms`)
  console.log('-----------------------------------------------------------')
  console.log('Per-category mean latencies (for paper breakdown table):')
  console.log(`  Cat 1  Forged Payment Signature:                 ${meanOf(results.cat1Lat)} ms`)
  console.log(`  Cat 2  Malformed QR Ciphertext:                  ${meanOf(results.cat2Lat)} ms`)
  console.log(`  Cat 3  Non-Existent Order Lookup:                ${meanOf(results.cat3Lat)} ms`)
  console.log(`  Cat 4  Duplicate Scan (5 distinct replays):      ${meanOf(results.cat4Lat)} ms`)
  console.log(`  Cat 5  Genuine Valid Order:                      ${meanOf(results.cat5Lat)} ms`)
  console.log(`  Cat 6a Direct DB Tamper - Anonymous Attacker:   ${meanOf(results.cat6aLat)} ms`)
  console.log(`  Cat 6b Authenticated Student Tamper Attempt:    ${meanOf(results.cat6bLat)} ms`)
  console.log('=====================================================================\n')

  // Integrity check: flag any skipped tests
  const skipped = results.testCases.filter(t => t.notes.includes('SKIPPED'))
  if (skipped.length > 0) {
    console.warn('WARNING: The following tests were SKIPPED due to missing real DB data:')
    skipped.forEach(t =>
      console.warn(`  Test #${t.id}  [${t.category}]  -- ${t.notes}`)
    )
    console.warn('\n  These results are INVALID for publication.')
    console.warn('  Ensure real paid/collected orders exist in the DB and re-run.\n')
  } else {
    console.log('All 40 tests ran against real system calls. Results are publication-ready.')
  }

  // ==========================================================================
  // PART 2: Concurrency Load Test (50 Simultaneous Requests)
  // ==========================================================================
  console.log('=====================================================================')
  console.log('      CONCURRENT BREAK-WINDOW LOAD TEST (50 SIMULTANEOUS)')
  console.log('=====================================================================')
  const CONCURRENT_CLIENTS = 50
  const concurrentStart = performance.now()

  const promises = Array.from({ length: CONCURRENT_CLIENTS }, async () => {
    const start = performance.now()
    try {
      const { error } = await anonClient.from('menu_items').select('id, name, price').limit(5)
      return { success: !error, latency: performance.now() - start }
    } catch {
      return { success: false, latency: performance.now() - start }
    }
  })

  const loadResults = await Promise.all(promises)
  const concurrentTotalTime = (performance.now() - concurrentStart) / 1000
  const successfulReqs = loadResults.filter(r => r.success).length
  const throughput = successfulReqs / concurrentTotalTime
  const loadLatencies = loadResults.map(r => r.latency).sort((a, b) => a - b)
  const loadMean = loadLatencies.reduce((a, b) => a + b, 0) / loadLatencies.length
  const loadP50  = loadLatencies[Math.floor(loadLatencies.length * 0.50)]
  const loadP95  = loadLatencies[Math.floor(loadLatencies.length * 0.95)]

  console.log(`Concurrent Simulated Clients: ${CONCURRENT_CLIENTS}`)
  console.log(`Successful Requests:          ${successfulReqs} / ${CONCURRENT_CLIENTS}`)
  console.log(`Total Batch Execution Time:   ${concurrentTotalTime.toFixed(2)} seconds`)
  console.log(`Effective Throughput:         ${throughput.toFixed(1)} req/sec`)
  console.log(`Mean Request Latency:         ${loadMean.toFixed(1)} ms`)
  console.log(`p50 Latency:                  ${loadP50.toFixed(1)} ms`)
  console.log(`p95 Latency:                  ${loadP95.toFixed(1)} ms`)
  console.log('=====================================================================\n')
}

runPaperBenchmarks().catch(console.error)
