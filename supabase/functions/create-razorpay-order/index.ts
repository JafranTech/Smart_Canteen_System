import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const razorpayKeyId = (Deno.env.get("RAZORPAY_KEY_ID") ?? "").trim()
    const razorpayKeySecret = (Deno.env.get("RAZORPAY_KEY_SECRET") ?? "").trim()

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ 
          error: "Razorpay credentials not configured on server", 
          debug: { hasKeyId: !!razorpayKeyId, hasSecret: !!razorpayKeySecret } 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Authenticate student
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session", authError: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Parse request amount
    const body = await req.json().catch(() => ({}))
    const totalAmount = Number(body.totalAmount)
    if (!totalAmount || totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid totalAmount provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Create order on Razorpay (Amount in paise: Rs.1 = 100 paise)
    const amountInPaise = Math.round(totalAmount * 100)
    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    const receiptId = `canteen_${user.id.slice(0, 8)}_${Date.now()}`.slice(0, 40)

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptId,
        notes: {
          student_id: user.id,
        },
      }),
    })

    const rzpData = await razorpayRes.json()
    if (!razorpayRes.ok) {
      console.error("Razorpay API error:", rzpData)
      return new Response(
        JSON.stringify({ 
          error: rzpData.error?.description || "Failed to create Razorpay order",
          razorpay_error: rzpData.error 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        razorpay_order_id: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        key_id: razorpayKeyId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("create-razorpay-order error:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
