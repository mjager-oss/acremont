import { supabase } from "./supabase-browser"

type NotificationEntity = "transaction_request" | "payout_method"

export async function dispatchOperationalEmails(
  entityType?: NotificationEntity,
  entityId?: string,
) {
  if (!supabase) return
  const body = entityType && entityId
    ? { entity_type: entityType, entity_id: entityId }
    : {}

  const { error } = await supabase.functions.invoke("send-operational-email", { body })
  if (error) console.warn("Acremont notification delivery is queued for retry.", error.message)
}
