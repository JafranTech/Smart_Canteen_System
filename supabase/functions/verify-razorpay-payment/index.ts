import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.0"
import CryptoJS from "npm:crypto-js@4.2.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// HMAC-SHA256 signature verification helper
function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  try {
    const text = `${orderId}|${paymentId}`
    const expected = CryptoJS.HmacSHA256(text, secret).toString(CryptoJS.enc.Hex)
    return expected.toLowerCase() === signature.trim().toLowerCase()
  } catch (e) {
    console.error("Signature verification error:", e)
    return false
  }
}

Deno.serve(async (req: Request) => {
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
    const razorpayKeySecret = (Deno.env.get("RAZORPAY_KEY_SECRET") ?? "").trim()
    const qrSecret = (Deno.env.get("QR_SECRET") ?? "").trim()

    if (!supabaseUrl || !supabaseServiceRoleKey || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Server credentials configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Authenticate student
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Parse payload
    const body = await req.json().catch(() => ({}))
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartItems,
      totalAmount,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing Razorpay verification parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Cryptographic Signature Verification
    const isSignatureValid = verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    )

    if (!isSignatureValid) {
      console.warn(`[Security Alert] Forged Razorpay signature detected for user ${user.id}`)
      return new Response(
        JSON.stringify({ error: "Payment verification failed: Invalid cryptographic signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 4. Create Order & QR Token using Service Role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const orderId = crypto.randomUUID()
    const rawToken = `${orderId}:${user.id}:${Date.now()}`
    const qrToken = qrSecret
      ? CryptoJS.AES.encrypt(rawToken, qrSecret).toString()
      : rawToken

    // Decrement stock atomically
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      for (const item of cartItems) {
        const { error: stockErr } = await adminClient.rpc("decrement_stock", {
          item_id: item.id,
          qty: item.quantity,
        })
        if (stockErr) {
          console.warn("Stock decrement warning:", stockErr)
        }
      }
    }

    // Insert Order with status: 'paid'
    const { error: orderError } = await adminClient
      .from("orders")
      .insert({
        id: orderId,
        student_id: user.id,
        total_amount: totalAmount,
        status: "paid",
        qr_token: qrToken,
        qr_scanned_count: 0,
      })

    if (orderError) {
      console.error("Order creation failed in verify-razorpay-payment:", orderError)
      return new Response(
        JSON.stringify({ error: "Failed to persist order in database", details: orderError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Insert Order Items
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      const items = cartItems.map((item: any) => ({
        order_id: orderId,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      }))
      const { error: itemsError } = await adminClient
        .from("order_items")
        .insert(items)

      if (itemsError) {
        console.error("Order items insert warning:", itemsError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        qrToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("verify-razorpay-payment error:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
