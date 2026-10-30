import { CoingeckoPricingClient } from "npm:@tetherto/wdk-pricing-coingecko-http@1.0.0-beta.2"
import { createClient } from "npm:@supabase/supabase-js@2"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

const coinIds: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  SOL: "solana",
  XRP: "ripple",
}

function respond(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return respond(405, { error: "Method not allowed." })

  const authorization = request.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return respond(401, { error: "Sign in to request a payment quote." })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return respond(500, { error: "Supabase function secrets are not configured." })

  const token = authorization.slice("Bearer ".length)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !userData.user) return respond(401, { error: "Your session is invalid. Sign in again." })

  let body: { p_plan_slug?: string; p_amount?: number; p_crypto_wallet_id?: string }
  try {
    body = await request.json()
  } catch {
    return respond(400, { error: "Invalid quote request." })
  }
  if (!body.p_plan_slug || !body.p_crypto_wallet_id || !Number.isFinite(Number(body.p_amount)) || Number(body.p_amount) <= 0) {
    return respond(400, { error: "Choose a plan, amount, and configured crypto wallet." })
  }

  const { data: wallet, error: walletError } = await userClient
    .from("crypto_wallets")
    .select("id,asset,enabled")
    .eq("id", body.p_crypto_wallet_id)
    .eq("enabled", true)
    .single()
  if (walletError || !wallet) return respond(400, { error: "This crypto wallet is unavailable. Choose an enabled wallet." })

  const coinId = coinIds[String(wallet.asset).toUpperCase()]
  if (!coinId) return respond(400, { error: "Live pricing is not configured for this crypto asset." })

  try {
    const pricing = new CoingeckoPricingClient({
      coinIds: { SOL: "solana", XRP: "ripple" },
    })
    const price = Number(await pricing.getCurrentPrice(String(wallet.asset).toUpperCase(), "USD"))
    if (!Number.isFinite(price) || price <= 0) {
      return respond(503, { error: "The crypto price feed returned a missing or stale price. Please try again shortly." })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: updatedWallet, error: updateError } = await admin
      .from("crypto_wallets")
      .update({ quote_usd_per_unit: price })
      .eq("id", wallet.id)
      .eq("enabled", true)
      .select("id")
      .maybeSingle()
    if (updateError || !updatedWallet) return respond(400, { error: "Wallet settings changed. Refresh and try again." })

    const { data: requestId, error: quoteError } = await userClient.rpc("create_investment_payment_request", {
      p_plan_slug: body.p_plan_slug,
      p_amount: Number(body.p_amount),
      p_payment_method: "crypto",
      p_crypto_wallet_id: wallet.id,
      p_bank_account_id: null,
    })
    if (quoteError || !requestId) return respond(400, { error: quoteError?.message ?? "Unable to create the payment quote." })

    return respond(200, {
      request_id: requestId,
      price_usd: price,
      price_retrieved_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Live crypto quote failed", error)
    if ((error as { response?: { status?: number } })?.response?.status === 429) {
      return respond(503, { error: "The free crypto price feed is busy. Please wait a moment and request the quote again." })
    }
    return respond(503, { error: "Unable to fetch the current crypto rate. Please try again shortly." })
  }
})
