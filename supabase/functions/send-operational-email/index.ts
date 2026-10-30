import { createClient } from "npm:@supabase/supabase-js@2"
import { renderOperationalEmail } from "./_shared/operational-email-template.ts"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

type OutboxItem = {
  id: string
  recipient_user_id: string
  entity_type: "transaction_request" | "payout_method"
  entity_id: string
  event_type: string
  payload: Record<string, unknown>
  attempt_count: number
}

function respond(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "POST") return respond(405, { error: "Method not allowed." })

  const authorization = request.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return respond(401, { error: "Sign in to send account notifications." })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL")
  const siteUrl = Deno.env.get("APP_SITE_URL") ?? "https://acremontfinance.online"

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey || !resendFromEmail) {
    return respond(500, { error: "Supabase and Resend function secrets must be configured." })
  }

  const token = authorization.slice("Bearer ".length)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !authData.user) return respond(401, { error: "Your session is invalid. Sign in again." })

  let body: { entity_type?: string; entity_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    // An empty request drains only the signed-in user's own pending notices.
  }

  if ((body.entity_type && !body.entity_id) || (!body.entity_type && body.entity_id)) {
    return respond(400, { error: "Provide both an entity type and entity ID, or leave both empty." })
  }
  if (body.entity_type && !["transaction_request", "payout_method"].includes(body.entity_type)) {
    return respond(400, { error: "Unsupported notification entity." })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let queueQuery = admin
    .from("operational_email_outbox")
    .select("id,recipient_user_id,entity_type,entity_id,event_type,payload,attempt_count")
    .in("status", ["pending", "failed"])
    .lt("attempt_count", 5)
    .order("created_at", { ascending: true })
    .limit(25)

  if (body.entity_type && body.entity_id) {
    queueQuery = queueQuery
      .eq("entity_type", body.entity_type)
      .eq("entity_id", body.entity_id)
  } else {
    queueQuery = queueQuery.eq("recipient_user_id", authData.user.id)
  }

  const { data: queued, error: queueError } = await queueQuery
  if (queueError) return respond(500, { error: "Could not load queued account notifications." })

  const isOfficer = authData.user.app_metadata?.role === "investment_officer"
  const authorizedItems = ((queued ?? []) as OutboxItem[]).filter(
    (item) => item.recipient_user_id === authData.user.id || isOfficer,
  )

  let sent = 0
  let failed = 0

  for (const item of authorizedItems) {
    const { data: claimed, error: claimError } = await admin
      .from("operational_email_outbox")
      .update({ status: "sending", attempt_count: item.attempt_count + 1, last_error: null })
      .eq("id", item.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle()
    if (claimError || !claimed) continue

    try {
      const { data: recipientData, error: recipientError } = await admin.auth.admin.getUserById(item.recipient_user_id)
      const recipient = recipientData.user
      if (recipientError || !recipient?.email) throw new Error("The account has no deliverable email address.")

      const firstName = String(recipient.user_metadata?.full_name ?? "").trim().split(/\s+/)[0] || "Investor"
      const email = renderOperationalEmail({
        eventType: item.event_type,
        firstName,
        payload: item.payload,
        siteUrl,
      })

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": item.id,
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [recipient.email],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      })

      if (!resendResponse.ok) {
        const detail = await resendResponse.text()
        throw new Error(`Resend returned ${resendResponse.status}: ${detail.slice(0, 500)}`)
      }

      const { error: sentError } = await admin
        .from("operational_email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", item.id)
      if (sentError) throw new Error("Email was accepted, but the outbox status could not be saved.")
      sent += 1
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Email delivery failed."
      await admin
        .from("operational_email_outbox")
        .update({ status: "failed", last_error: detail.slice(0, 1000) })
        .eq("id", item.id)
      failed += 1
    }
  }

  return respond(200, { sent, failed, queued: authorizedItems.length })
})
