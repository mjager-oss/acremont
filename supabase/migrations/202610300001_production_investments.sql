-- Production data foundation. Does not seed fictional plans, rates, wallet addresses,
-- or balances. Configure real approved values before enabling any plan or wallet.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.is_investment_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'investment_officer', false);
$$;

create table if not exists public.investment_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  annual_rate_percent numeric(7,4) not null check (annual_rate_percent >= 0 and annual_rate_percent <= 100),
  term_months integer not null check (term_months > 0),
  minimum_amount numeric(20,2) not null check (minimum_amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  description text,
  features text[] not null default '{}',
  accrual_method text not null default 'simple_daily' check (accrual_method in ('simple_daily')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (length(topic) between 2 and 120),
  message text not null check (length(message) between 10 and 10000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  officer_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investor_profiles enable row level security;
alter table public.support_tickets enable row level security;
create policy "investors read own profile"
  on public.investor_profiles for select to authenticated using (auth.uid() = user_id or public.is_investment_officer());
create policy "investors edit own profile"
  on public.investor_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "investors create own profile"
  on public.investor_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "investors read own support tickets"
  on public.support_tickets for select to authenticated using (auth.uid() = user_id or public.is_investment_officer());
create policy "investors create own support tickets"
  on public.support_tickets for insert to authenticated with check (auth.uid() = user_id and status = 'open');
create policy "officers update support tickets"
  on public.support_tickets for update to authenticated using (public.is_investment_officer()) with check (public.is_investment_officer());

create or replace function public.sync_investor_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.investor_profiles(user_id, email, full_name, phone)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (user_id) do update set email = excluded.email, full_name = excluded.full_name, phone = excluded.phone, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.sync_investor_profile();

create table if not exists public.crypto_wallets (
  id uuid primary key default gen_random_uuid(),
  asset text not null check (asset in ('BTC', 'ETH', 'USDT', 'SOL', 'XRP')),
  network text not null,
  address text not null check (length(trim(address)) >= 16),
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (asset, network)
);

create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bank', 'crypto')),
  label text not null,
  details jsonb not null,
  status text not null default 'pending_verification' check (status in ('pending_verification', 'verified', 'rejected')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(details) = 'object')
);

create unique index if not exists payout_methods_one_default_per_user
  on public.payout_methods(user_id) where is_default;

create table if not exists public.transaction_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('investment', 'withdrawal')),
  amount numeric(20,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  plan_id uuid references public.investment_plans(id),
  payout_method_id uuid references public.payout_methods(id),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'pending_review', 'approved', 'rejected', 'paid', 'expired')),
  payment_quote_amount numeric(38,18) check (payment_quote_amount is null or payment_quote_amount > 0),
  payment_quote_expires_at timestamptz,
  payment_asset text,
  payment_network text,
  payment_tx_hash text,
  officer_id uuid references auth.users(id),
  officer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check ((kind = 'investment' and plan_id is not null) or (kind = 'withdrawal' and plan_id is null))
);

create table if not exists public.deposit_reconciliations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.transaction_requests(id) on delete restrict,
  officer_id uuid not null references auth.users(id),
  verified_amount numeric(20,2) not null check (verified_amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  asset text not null,
  network text not null,
  transaction_hash text not null,
  verified_at timestamptz not null default now(),
  unique (asset, network, transaction_hash)
);

create unique index if not exists transaction_requests_chain_tx_hash
  on public.transaction_requests(payment_asset, payment_network, payment_tx_hash)
  where payment_tx_hash is not null;

create table if not exists public.investment_positions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.transaction_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  plan_id uuid not null references public.investment_plans(id) on delete restrict,
  principal numeric(20,2) not null check (principal > 0),
  annual_rate_percent numeric(7,4) not null check (annual_rate_percent >= 0 and annual_rate_percent <= 100),
  term_months integer not null check (term_months > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  starts_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'matured', 'closed'))
);

alter table public.investment_plans enable row level security;
alter table public.crypto_wallets enable row level security;
alter table public.payout_methods enable row level security;
alter table public.transaction_requests enable row level security;
alter table public.investment_positions enable row level security;
alter table public.deposit_reconciliations enable row level security;

create policy "enabled plans are public"
  on public.investment_plans for select to anon, authenticated using (enabled);
create policy "officers manage plans"
  on public.investment_plans for all to authenticated using (public.is_investment_officer()) with check (public.is_investment_officer());

create policy "enabled crypto wallets are public"
  on public.crypto_wallets for select to anon, authenticated using (enabled);
create policy "officers manage wallets"
  on public.crypto_wallets for all to authenticated using (public.is_investment_officer()) with check (public.is_investment_officer());

create policy "investors read own payout methods"
  on public.payout_methods for select to authenticated using (auth.uid() = user_id or public.is_investment_officer());
create policy "investors create own payout methods"
  on public.payout_methods for insert to authenticated with check (auth.uid() = user_id and status = 'pending_verification');
create policy "investors edit own unverified payout methods"
  on public.payout_methods for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and status = 'pending_verification');
create policy "officers verify payout methods"
  on public.payout_methods for update to authenticated using (public.is_investment_officer()) with check (public.is_investment_officer());
create policy "investors delete own unverified payout methods"
  on public.payout_methods for delete to authenticated using (auth.uid() = user_id and status <> 'verified');

create policy "investors read own requests"
  on public.transaction_requests for select to authenticated using (auth.uid() = user_id or public.is_investment_officer());
create policy "officers review requests"
  on public.transaction_requests for update to authenticated using (public.is_investment_officer()) with check (public.is_investment_officer());

create policy "investors read own positions"
  on public.investment_positions for select to authenticated using (auth.uid() = user_id or public.is_investment_officer());
create policy "investors read own deposit reconciliations"
  on public.deposit_reconciliations for select to authenticated
  using (exists(select 1 from public.transaction_requests r where r.id = request_id and (r.user_id = auth.uid() or public.is_investment_officer())));

revoke all on public.transaction_requests from anon, authenticated;
grant select on public.transaction_requests to authenticated;
revoke all on public.investment_positions from anon, authenticated;
grant select on public.investment_positions to authenticated;
revoke all on public.investor_profiles from anon, authenticated;
grant select, update on public.investor_profiles to authenticated;

create or replace function public.create_investment_request(p_plan_slug text, p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email_confirmed_at timestamptz;
  v_plan public.investment_plans%rowtype;
  v_request_id uuid;
begin
  select email_confirmed_at into v_email_confirmed_at from auth.users where id = v_user_id;
  if v_user_id is null or v_email_confirmed_at is null then
    raise exception 'A verified, signed-in account is required.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an investment amount greater than zero.' using errcode = '22023';
  end if;
  select * into v_plan from public.investment_plans where slug = p_plan_slug and enabled;
  if not found then raise exception 'This investment plan is not currently available.' using errcode = '22023'; end if;
  if p_amount < v_plan.minimum_amount then
    raise exception 'The minimum for this plan is % %.', v_plan.minimum_amount, v_plan.currency using errcode = '22023';
  end if;
  insert into public.transaction_requests(user_id, kind, amount, currency, plan_id, status)
  values (v_user_id, 'investment', p_amount, v_plan.currency, v_plan.id, 'pending_payment')
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.create_withdrawal_request(p_amount numeric, p_payout_method_id uuid, p_currency text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email_confirmed_at timestamptz;
  v_method public.payout_methods%rowtype;
  v_request_id uuid;
  v_available numeric(20,2);
  v_reserved numeric(20,2);
begin
  select email_confirmed_at into v_email_confirmed_at from auth.users where id = v_user_id;
  if v_user_id is null or v_email_confirmed_at is null then
    raise exception 'A verified, signed-in account is required.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount greater than zero.' using errcode = '22023'; end if;
  select * into v_method from public.payout_methods where id = p_payout_method_id and user_id = v_user_id and status = 'verified';
  if not found then raise exception 'Choose a verified payout method.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || upper(p_currency), 0));
  select coalesce(sum(accrued_gain), 0) into v_available
    from public.investment_position_accruals where user_id = v_user_id and currency = p_currency;
  select coalesce(sum(amount), 0) into v_reserved
    from public.transaction_requests
    where user_id = v_user_id and kind = 'withdrawal' and currency = p_currency and status in ('pending_review', 'approved');
  if p_amount > greatest(v_available - v_reserved, 0) then
    raise exception 'Requested amount exceeds accrued gains available for withdrawal.' using errcode = '22023';
  end if;
  insert into public.transaction_requests(user_id, kind, amount, currency, payout_method_id, status)
  values (v_user_id, 'withdrawal', p_amount, upper(p_currency), v_method.id, 'pending_review')
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.officer_record_deposit(
  p_request_id uuid,
  p_amount numeric,
  p_currency text,
  p_asset text,
  p_network text,
  p_tx_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.transaction_requests%rowtype;
begin
  if not public.is_investment_officer() then
    raise exception 'Investment officer permission required.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or length(trim(coalesce(p_tx_hash, ''))) < 16 then
    raise exception 'Enter the independently verified amount and transaction hash.' using errcode = '22023';
  end if;
  select * into v_request from public.transaction_requests where id = p_request_id for update;
  if not found or v_request.kind <> 'investment' or v_request.status <> 'pending_review' then
    raise exception 'Investment request is not awaiting payment verification.' using errcode = '22023';
  end if;
  if v_request.payment_tx_hash is null
    or lower(trim(v_request.payment_tx_hash)) <> lower(trim(p_tx_hash))
    or v_request.payment_asset <> p_asset
    or v_request.payment_network <> p_network
    or v_request.currency <> upper(p_currency) then
    raise exception 'Verified chain, transaction hash, or settlement currency does not match the investor-submitted request.' using errcode = '22023';
  end if;
  insert into public.deposit_reconciliations(request_id, officer_id, verified_amount, currency, asset, network, transaction_hash)
  values (v_request.id, auth.uid(), p_amount, upper(p_currency), p_asset, p_network, trim(p_tx_hash))
  on conflict (request_id) do update set officer_id = excluded.officer_id, verified_amount = excluded.verified_amount, currency = excluded.currency, asset = excluded.asset, network = excluded.network, transaction_hash = excluded.transaction_hash, verified_at = now();
  update public.transaction_requests set amount = p_amount, currency = upper(p_currency)
  where id = p_request_id;
end;
$$;

create or replace function public.submit_crypto_payment(p_request_id uuid, p_asset text, p_network text, p_tx_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.transaction_requests%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in is required.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_tx_hash, ''))) < 16 then raise exception 'Enter a valid transaction hash.' using errcode = '22023'; end if;
  if not exists(select 1 from public.crypto_wallets where asset = p_asset and network = p_network and enabled) then
    raise exception 'This asset and network are not accepting payments.' using errcode = '22023';
  end if;
  select * into v_request from public.transaction_requests where id = p_request_id and user_id = v_user_id and kind = 'investment' for update;
  if not found or v_request.status <> 'pending_payment' then raise exception 'Investment request is not awaiting payment.' using errcode = '22023'; end if;
  if v_request.payment_quote_amount is null or v_request.payment_quote_expires_at is null then
    raise exception 'A verified crypto quote has not been configured by an investment officer.' using errcode = '22023';
  end if;
  if v_request.payment_quote_expires_at <= now() then
    update public.transaction_requests set status = 'expired' where id = p_request_id;
    raise exception 'Payment quote expired. Request a refreshed quote from the investment officer.' using errcode = '22023';
  end if;
  if v_request.payment_asset <> p_asset or v_request.payment_network <> p_network then
    raise exception 'Payment asset and network must match the officer-issued quote.' using errcode = '22023';
  end if;
  update public.transaction_requests set payment_asset = p_asset, payment_network = p_network, payment_tx_hash = trim(p_tx_hash), status = 'pending_review'
  where id = p_request_id and user_id = v_user_id and kind = 'investment' and status = 'pending_payment';
  if not found then raise exception 'The request could not be updated.' using errcode = '22023'; end if;
end;
$$;

create or replace function public.officer_set_payment_quote(
  p_request_id uuid,
  p_asset text,
  p_network text,
  p_crypto_amount numeric
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires_at timestamptz := now() + interval '90 minutes';
begin
  if not public.is_investment_officer() then
    raise exception 'Investment officer permission required.' using errcode = '42501';
  end if;
  if p_crypto_amount is null or p_crypto_amount <= 0 then
    raise exception 'Enter the verified crypto conversion amount.' using errcode = '22023';
  end if;
  if not exists(select 1 from public.crypto_wallets where asset = p_asset and network = p_network and enabled) then
    raise exception 'Enable a verified wallet for this asset and network before issuing a quote.' using errcode = '22023';
  end if;
  update public.transaction_requests
    set payment_asset = p_asset,
        payment_network = p_network,
        payment_quote_amount = p_crypto_amount,
        payment_quote_expires_at = v_expires_at
    where id = p_request_id and kind = 'investment' and status = 'pending_payment';
  if not found then raise exception 'Request is not awaiting a payment quote.' using errcode = '22023'; end if;
  return v_expires_at;
end;
$$;

create or replace function public.officer_decide_transaction(p_request_id uuid, p_decision text, p_asset text default null, p_network text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.transaction_requests%rowtype;
  v_plan public.investment_plans%rowtype;
begin
  if not public.is_investment_officer() then raise exception 'Investment officer permission required.' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid decision.' using errcode = '22023'; end if;
  select * into v_request from public.transaction_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending_review' then raise exception 'Request is not awaiting review.' using errcode = '22023'; end if;
  if p_decision = 'approved' and v_request.kind = 'investment' then
    if p_asset is null or p_network is null or p_asset <> v_request.payment_asset or p_network <> v_request.payment_network then
      raise exception 'Select the asset and network that match the submitted transaction.' using errcode = '22023';
    end if;
    if not exists(select 1 from public.deposit_reconciliations d where d.request_id = v_request.id and d.asset = p_asset and d.network = p_network and d.transaction_hash = v_request.payment_tx_hash) then
      raise exception 'Record and verify the actual on-chain deposit before approving this investment.' using errcode = '22023';
    end if;
  end if;
  update public.transaction_requests set status = p_decision, officer_id = auth.uid(), reviewed_at = now() where id = p_request_id;
  if p_decision = 'approved' and v_request.kind = 'investment' then
    if v_request.payment_tx_hash is null then raise exception 'Payment transaction must be supplied before approval.' using errcode = '22023'; end if;
    select * into v_plan from public.investment_plans where id = v_request.plan_id;
    insert into public.investment_positions(request_id, user_id, plan_id, principal, annual_rate_percent, term_months, currency)
    values (v_request.id, v_request.user_id, v_plan.id, v_request.amount, v_plan.annual_rate_percent, v_plan.term_months, v_request.currency);
  end if;
end;
$$;

create or replace view public.investment_position_accruals
with (security_invoker = true)
as
select
  p.id,
  p.request_id,
  p.user_id,
  p.plan_id,
  p.principal,
  p.currency,
  p.annual_rate_percent,
  p.term_months,
  p.starts_at,
  least(now(), p.starts_at + make_interval(months => p.term_months)) as accrual_through,
  round((p.principal * (p.annual_rate_percent / 100) *
    (extract(epoch from (least(now(), p.starts_at + make_interval(months => p.term_months)) - p.starts_at)) / 86400 / 365.25))::numeric, 2) as accrued_gain
from public.investment_positions p
where p.status = 'active';

revoke all on function public.create_investment_request(text, numeric) from public;
revoke all on function public.create_withdrawal_request(numeric, uuid, text) from public;
revoke all on function public.submit_crypto_payment(uuid, text, text, text) from public;
revoke all on function public.officer_set_payment_quote(uuid, text, text, numeric) from public;
revoke all on function public.officer_record_deposit(uuid, numeric, text, text, text, text) from public;
revoke all on function public.officer_decide_transaction(uuid, text, text, text) from public;
grant execute on function public.create_investment_request(text, numeric) to authenticated;
grant execute on function public.create_withdrawal_request(numeric, uuid, text) to authenticated;
grant execute on function public.submit_crypto_payment(uuid, text, text, text) to authenticated;
grant execute on function public.officer_set_payment_quote(uuid, text, text, numeric) to authenticated;
grant execute on function public.officer_record_deposit(uuid, numeric, text, text, text, text) to authenticated;
grant execute on function public.officer_decide_transaction(uuid, text, text, text) to authenticated;
grant select on public.investment_position_accruals to authenticated;
grant select, insert, update, delete on public.payout_methods to authenticated;
grant select on public.crypto_wallets, public.investment_plans, public.transaction_requests, public.investment_positions to authenticated;
grant select on public.investment_plans, public.crypto_wallets to anon;
grant select, insert, update, delete on public.investment_plans, public.crypto_wallets to authenticated;
grant insert, update on public.investor_profiles to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant update on public.support_tickets to authenticated;
