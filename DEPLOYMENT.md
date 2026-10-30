# Build and deployment

## Requirements

- Node.js 22 and pnpm 10 or newer.
- Deploy the app on a Node.js hosting platform that supports Next.js App Router and server rendering (for example, Vercel or a Node.js server).
- Netlify is configured in `netlify.toml` with the repository root as its base and the Next.js runtime plugin. Ensure the `app/` directory, `src/app-client.tsx`, Next.js config files, and package lockfile are included in the pushed commit; Next.js reports “Couldn't find any `pages` or `app` directory” when those uncommitted files are absent from Netlify's checkout.
- Set `NEXT_PUBLIC_SITE_URL=https://acremontfinance.online`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deployment environment. Never expose the Supabase service-role key in a `NEXT_PUBLIC_` variable.
- Point the `acremontfinance.online` DNS records to the selected hosting provider and enable HTTPS. Keep `NEXT_PUBLIC_SITE_URL` aligned with the canonical HTTPS hostname.
- In Supabase Auth URL Configuration, set `https://acremontfinance.online` as the Site URL and add the production callback URLs (including `https://acremontfinance.online/auth/callback` and `https://acremontfinance.online/`) to the redirect allow list.
- Apply every SQL file in `supabase/migrations` in filename order before publishing the frontend. The investment migrations create security policies and RPCs as well as the position and accrual ledger.
- Apply `202610300006_settled_withdrawals_reduce_accrued_gain.sql` after the earlier migrations. After an officer approves a withdrawal and the payout is actually sent, mark it paid in the review queue; paid withdrawals then reduce the investor's displayed accrued gains and withdrawal availability.
- Use the supplied Acremont wordmarks, favicon set and 1200×630 social preview image in `public/`. Page titles, canonical URLs, Open Graph/Twitter metadata, `sitemap.xml`, and `robots.txt` are provided through the Next.js App Router.
- The five responsive branded email templates are in `supabase/templates`; configure the three auth templates in Supabase Auth, then connect the transaction and security templates to the chosen transactional email sender.
- Deploy the `create-investment-payment-quote` Supabase Edge Function after applying migrations. It uses `@tetherto/wdk-pricing-coingecko-http` with CoinGecko's free public API to fetch the current USD price and create a 15-minute crypto quote. Deploy with `supabase functions deploy create-investment-payment-quote`; Supabase's `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` function secrets must be available.
- Grant or revoke officer access for an existing account with `supabase/admin/manage_investment_officer.sql`, executed in the Supabase SQL Editor as an administrator. Set exactly one of its email or user ID fields and set `grant_officer` to `true` or `false`. The script updates trusted app metadata; never accept officer roles from user-editable metadata.
- Seed or restore the Foundation, Growth and Strategic plan tiers with `supabase/admin/seed_investment_plans.sql`.
- Enable `pg_cron` for daily accrual. If unavailable, schedule `select public.accrue_investment_positions();` daily at 00:05 UTC using Supabase Cron or an authorized server scheduler.

## Build

Install locked dependencies with `pnpm install --frozen-lockfile`, then run `pnpm build`. Run locally with `pnpm dev`, or serve the production app with `pnpm start` after building.

Payment wallets, investor plans and payout verification require authorized configuration. The migrations do not create fictional rates, addresses, balances or payment receipts.
