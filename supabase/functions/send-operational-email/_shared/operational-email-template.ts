export type OperationalEmail = {
  eventType: string
  firstName: string
  payload: Record<string, unknown>
  siteUrl: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!)
}

function currencyAmount(value: unknown, currency: unknown): string {
  const amount = Number(value)
  const code = String(currency ?? "USD").toUpperCase()
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(code)) return ""
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${code}`
  }
}

export function renderOperationalEmail({ eventType, firstName, payload, siteUrl }: OperationalEmail) {
  const kind = String(payload.kind ?? "account")
  const status = String(payload.status ?? "updated").replaceAll("_", " ")
  const amount = currencyAmount(payload.amount, payload.currency)
  const isPayoutMethod = eventType.startsWith("payout_method_")
  const methodName = kind === "bank" ? "bank payout method" : "crypto payout method"
  const transactionName = kind === "withdrawal" ? "withdrawal" : "investment"

  let subject = "An update to your Acremont account"
  let heading = "There’s an update to your account"
  let message = "An account activity has been recorded."
  const rows: Array<[string, string]> = []

  if (isPayoutMethod) {
    rows.push(["Method", methodName])
    if (eventType === "payout_method_added") {
      subject = "Payout method received"
      heading = "We received your payout method"
      message = "Your payout method was added to your account. It must be verified before it can be used for withdrawals."
      rows.push(["Status", status])
    } else if (eventType === "payout_method_edited") {
      subject = "Payout method updated"
      heading = "Your payout method was updated"
      message = "The payout method details on your account were changed. If you did not make this change, contact support."
      rows.push(["Status", status])
    } else if (eventType === "payout_method_status_changed") {
      subject = status === "verified" ? "Payout method verified" : `Payout method ${status}`
      heading = status === "verified" ? "Your payout method is verified" : `Your payout method is ${status}`
      message = status === "verified"
        ? "You can now select this method when requesting a withdrawal."
        : `Your payout method status has changed to ${status}. Sign in to review your account. If you need help, contact support.`
      rows.push(["Status", status])
    } else if (eventType === "payout_method_removed") {
      subject = "Payout method removed"
      heading = "A payout method was removed"
      message = "A payout method was removed from your account. If you did not make this change, contact support."
    }
  } else {
    const planName = String(payload.plan_name ?? "")
    if (eventType === "transaction_created") {
      subject = `We received your ${transactionName} request`
      heading = "Your request has been received"
      message = `We received your ${transactionName} request. We’ll email you when its status changes.`
    } else if (eventType === "transaction_payment_submitted") {
      subject = "Payment details received"
      heading = "Your payment details were received"
      message = "Your payment details have been submitted for review. The request remains pending until it has been verified."
    } else if (eventType === "transaction_status_changed") {
      subject = `Your ${transactionName} request was ${status}`
      heading = "Your request status changed"
      message = `Your ${transactionName} request is now ${status}. Sign in to review the latest details.`
    }
    rows.push(["Request", transactionName])
    if (amount) rows.push(["Amount", amount])
    if (planName) rows.push(["Plan", planName])
    rows.push(["Status", status])
    if (payload.payment_reference) rows.push(["Payment reference", String(payload.payment_reference)])
  }

  const safeSiteUrl = escapeHtml(siteUrl.replace(/\/$/, ""))
  const safeFirstName = escapeHtml(firstName || "Investor")
  const detailRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;color:#53685d;font-size:13px;border-bottom:1px solid #dfe9e2">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;color:#183c32;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #dfe9e2">${escapeHtml(value)}</td>
    </tr>`).join("")

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f3f0e7;color:#252a27;font-family:Arial,Helvetica,sans-serif">
  <div style="width:100%;padding:28px 12px;background:#f3f0e7">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #dce5de;border-radius:8px;overflow:hidden">
      <tr><td style="padding:26px 30px;background:#183c32;border-bottom:4px solid #cadbcf"><img src="https://acremontfinance.online/brand/acremont-full-cream.png" width="178" alt="Acremont" style="display:block;width:178px;height:auto;border:0"></td></tr>
      <tr><td style="padding:30px 30px 26px"><p style="margin:0 0 10px;color:#557766;font-size:11px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase">ACCOUNT UPDATE</p><h1 style="margin:0;color:#183c32;font-family:Georgia,serif;font-size:27px;font-weight:500;line-height:1.25">${escapeHtml(heading)}</h1><p style="margin:18px 0 0;font-size:15px;line-height:1.7">Hello ${safeFirstName},</p><p style="margin:10px 0 0;color:#4c5550;font-size:15px;line-height:1.7">${escapeHtml(message)}</p>
      ${rows.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;background:#e5eee8;border:1px solid #d7e4db;border-radius:5px">${detailRows}</table>` : ""}
      <p style="margin:24px 0 0"><a href="${safeSiteUrl}/app/overview" style="display:inline-block;padding:13px 19px;background:#183c32;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:700">Open your account</a></p>
      <p style="margin:16px 0 0;color:#657169;font-size:12px;line-height:1.65">If you did not make this change, contact Acremont support promptly. Never send your password or verification code by email.</p></td></tr>
      <tr><td style="padding:20px 30px;background:#183c32;border-top:4px solid #cadbcf;color:#e7efe9;font-size:11px;line-height:1.8"><strong style="font-size:12px">Acremont Support</strong><br><a href="mailto:support@acremontfinance.online" style="color:#fff;font-weight:700">support@acremontfinance.online</a><br><a href="tel:+17652165458" style="color:#fff">+1 (765) 216-5458</a><br>120 Park Ave, New York, NY 10117, United States</td></tr>
    </table>
  </div>
</body></html>`

  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n")
  const text = `${heading}\n\nHello ${firstName || "Investor"},\n\n${message}${textRows ? `\n\n${textRows}` : ""}\n\nOpen your account: ${siteUrl.replace(/\/$/, "")}/app/overview\n\nAcremont Support\nsupport@acremontfinance.online\n+1 (765) 216-5458\n120 Park Ave, New York, NY 10117, United States\n\nIf you did not make this change, contact support. Never send your password or verification code by email.`

  return { subject, html, text }
}
