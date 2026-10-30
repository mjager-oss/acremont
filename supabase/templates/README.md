# Acremont email templates

These responsive templates use a deep Acremont green header and footer, the cream wordmark, and the brand cream (`#F3F0E7`) for contrast. Set the public Supabase Site URL so the wordmark resolves at `/brand/acremont-full-cream.png`.

## Auth templates

- `welcome.html`: Supabase signup confirmation. Uses `{{ .Data.full_name }}`, `{{ .ConfirmationURL }}` and `{{ .SiteURL }}`.
- `login.html`: Supabase magic-link sign-in. Uses `{{ .Data.full_name }}` and `{{ .ConfirmationURL }}`.
- `verification.html`: Supabase one-time verification code. Uses `{{ .Data.full_name }}` and `{{ .Token }}`.

Set the matching content in the Supabase Auth email template editor. Keep the action URLs and token expressions intact. The signup form stores the user name as `full_name`. Matching plain-text versions are included for all five messages.

## Account notifications

- `transaction.html`: send after a request status changes. Supply `first_name`, `transaction_type`, `status`, `amount`, `currency`, `reference`, `message`, `dashboard_url`, and `SiteURL`.
- `security-action.html`: send after a password, email, or other security change. Supply `first_name`, `action`, `occurred_at`, `device`, `location`, `security_url`, and `SiteURL`.

The transaction and security templates are ready for the project's chosen notification sender; they are not sent automatically by Supabase Auth. Keep subjects factual, include a matching plain-text alternative in the sender, and use the correct recipient event so users receive only relevant operational mail.

