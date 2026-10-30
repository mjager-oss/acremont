# Email templates and delivery

The HTML and plain text files in this folder are branded references for welcome, login, verification, transaction and security messages. Authentication email templates are configured in Supabase under **Authentication → Email Templates**.

Transaction and payout-method activity is sent by the Resend Edge Function. There is no Supabase dashboard slot for these application event templates: the actual responsive template is rendered in `supabase/functions/send-operational-email/_shared/operational-email-template.ts`. The database triggers in `supabase/migrations/202610300007_operational_email_outbox.sql` queue transaction creation/payment/status events and payout-method addition/edit/status/removal events. The dashboard invokes `send-operational-email` after user or officer actions and drains the signed-in user's pending queue on dashboard entry.

## Setup

1. Apply all SQL migrations in filename order, including `202610300007_operational_email_outbox.sql`.
2. Set Edge Function secrets:

   ```sh
   supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL="Acremont Finance <notifications@your-verified-domain>" APP_SITE_URL=https://acremontfinance.online
   ```

   `RESEND_API_KEY` is the Resend API key (also used as the SMTP password when configuring SMTP). Verify the sender domain/address in Resend first. Supabase's Auth SMTP settings do not send application transaction notifications.

3. Deploy the sender:

   ```sh
   supabase functions deploy send-operational-email
   ```

The outbox retries failed deliveries when the user or officer next opens the dashboard, up to five attempts. Emails intentionally omit bank account and crypto wallet details. Delivery status and errors are retained in the service-role-only `operational_email_outbox` table.
