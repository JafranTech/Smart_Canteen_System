import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.0"
import CryptoJS from "npm:crypto-js@4.2.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const ORDER_EXPIRY_HOURS = 4
const ORDER_SELECT = `
  *,
  profiles!orders_student_id_fkey (name, college_id),
  order_items (
    quantity,
    unit_price,
    menu_items (name, image_url)
  )
`

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const qrSecret = (Deno.env.get("QR_SECRET") ?? "").trim()

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Authenticate caller using their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Verify caller has staff or admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileErr || !profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Staff or Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Parse request body
    const body = await req.json().catch(() => ({}))
    const scannedToken = (body.token || "").trim()
    if (!scannedToken) {
      return new Response(
        JSON.stringify({ valid: false, reason: "invalid_qr", message: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Helper to log fraud attempt via service role client
    const logFraud = async (orderId: string | null, reason: string, notes: string) => {
      try {
        await adminClient.from("fraud_logs").insert({
          order_id: orderId,
          reason,
          scanned_by: user.id,
          notes,
        })
      } catch (err) {
        console.error("Failed to log fraud:", err)
      }
    }

    // 4. Decrypt token using server-side secret
    let decrypted: string | null = null
    if (qrSecret) {
      try {
        const bytes = CryptoJS.AES.decrypt(scannedToken, qrSecret)
        decrypted = bytes.toString(CryptoJS.enc.Utf8) || null
      } catch {
        decrypted = null
      }
    }

    let queryCol = "qr_token"
    let queryVal = scannedToken
    let orderId: string | null = null
    let isShortId = false

    if (decrypted) {
      const parts = decrypted.split(":")
      if (parts.length >= 1 && parts[0]) {
        orderId = parts[0]
        queryCol = "id"
        queryVal = orderId
      } else {
        await logFraud(null, "invalid_qr", "Decrypted payload malformed")
        return new Response(
          JSON.stringify({ valid: false, reason: "invalid_qr" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    } else {
      // Fallback: check if raw token matches UUID or 8-char short ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedToken)
      const isShort = /^[a-zA-Z0-9]{8}$/i.test(scannedToken)

      if (isUUID) {
        queryCol = "id"
        queryVal = scannedToken
      } else if (isShort) {
        isShortId = true
      } else {
        await logFraud(null, "invalid_qr", "Token decryption failed — unrecognized format")
        return new Response(
          JSON.stringify({ valid: false, reason: "invalid_qr" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    // 5. Fetch order from database
    let order = null
    if (isShortId) {
      const { data: activeOrders } = await adminClient
        .from("orders")
        .select(ORDER_SELECT)
        .in("status", ["paid", "ready", "collected"])
        .order("created_at", { ascending: false })
        .limit(200)

      if (activeOrders) {
        order = activeOrders.find((o: any) => o.id.toLowerCase().startsWith(scannedToken.toLowerCase())) || null
      }
    } else {
      const { data: fetchedOrder } = await adminClient
        .from("orders")
        .select(ORDER_SELECT)
        .eq(queryCol, queryVal)
        .single()
      order = fetchedOrder
    }

    if (!order) {
      await logFraud(null, "invalid_qr", "Order not found in database for provided token")
      return new Response(
        JSON.stringify({ valid: false, reason: "invalid_qr" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 6. Validate order state & fraud detection rules
    if (order.status === "collected") {
      await logFraud(order.id, "duplicate_scan", "Order was already collected previously")
      return new Response(
        JSON.stringify({ valid: false, reason: "duplicate_scan", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (order.qr_scanned_count >= 1) {
      await logFraud(order.id, "duplicate_scan", "QR token scan count >= 1")
      return new Response(
        JSON.stringify({ valid: false, reason: "duplicate_scan", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 7. Check expiration (4-hour window)
    const orderDate = new Date(order.created_at)
    const diffHours = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60)
    if (diffHours > ORDER_EXPIRY_HOURS) {
      await logFraud(order.id, "expired_order", `Order is ${Math.round(diffHours)}h old (exceeds ${ORDER_EXPIRY_HOURS}h limit)`)
      return new Response(
        JSON.stringify({ valid: false, reason: "expired_order", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (order.status !== "paid" && order.status !== "ready") {
      await logFraud(order.id, "invalid_qr", `Invalid order status: ${order.status}`)
      return new Response(
        JSON.stringify({ valid: false, reason: "invalid_qr", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verification Success!
    return new Response(
      JSON.stringify({ valid: true, order }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("verify-qr error:", err)
    return new Response(
      JSON.stringify({ valid: false, reason: "invalid_qr", error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
