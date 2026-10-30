alter table public.crypto_wallets
  add column if not exists quote_usd_per_unit numeric(38,18) not null default 0
  check (quote_usd_per_unit >= 0);

create table if not exists public.bank_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null check (length(trim(bank_name)) > 0),
  account_name text not null check (length(trim(account_name)) > 0),
  account_number text not null check (length(trim(account_number)) > 0),
  bank_country text not null check (length(trim(bank_country)) > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  routing_number text,
  swift_code text,
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.bank_payment_accounts enable row level security;
create policy "enabled bank payment accounts are public"
  on public.bank_payment_accounts for select to anon, authenticated using (enabled);
create policy "officers manage bank payment accounts"
  on public.bank_payment_accounts for all to authenticated
  using (public.is_investment_officer()) with check (public.is_investment_officer());
grant select on public.bank_payment_accounts to anon, authenticated;
grant insert, update, delete on public.bank_payment_accounts to authenticated;

alter table public.transaction_requests
  drop constraint if exists transaction_requests_status_check;
alter table public.transaction_requests
  add constraint transaction_requests_status_check
  check (status in ('pending_payment', 'pending_review', 'approved', 'rejected', 'paid', 'expired', 'cancelled'));
alter table public.transaction_requests
  add column if not exists payment_method text check (payment_method is null or payment_method in ('crypto', 'bank')),
  add column if not exists bank_payment_account_id uuid references public.bank_payment_accounts(id),
  add column if not exists payment_reference text;

create or replace function public.create_investment_payment_request(
  p_plan_slug text,
  p_amount numeric,
  p_payment_method text,
  p_crypto_wallet_id uuid default null,
  p_bank_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_confirmed_at timestamptz;
  v_plan public.investment_plans%rowtype;
  v_wallet public.crypto_wallets%rowtype;
  v_bank public.bank_payment_accounts%rowtype;
  v_id uuid := gen_random_uuid();
  v_quote numeric(38,18);
begin
  select email_confirmed_at into v_confirmed_at from auth.users where id = v_user_id;
  if v_user_id is null or v_confirmed_at is null then
    raise exception 'A verified, signed-in account is required.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount greater than zero.' using errcode = '22023'; end if;
  select * into v_plan from public.investment_plans where slug = p_plan_slug and enabled;
  if not found then raise exception 'This investment plan is not currently available.' using errcode = '22023'; end if;
  if p_amount < v_plan.minimum_amount then raise exception 'The minimum for this plan is % %.', v_plan.minimum_amount, v_plan.currency using errcode = '22023'; end if;
  if p_payment_method = 'crypto' then
    select * into v_wallet from public.crypto_wallets where id = p_crypto_wallet_id and enabled and quote_usd_per_unit > 0;
    if not found then raise exception 'Choose an enabled crypto wallet with a configured quote rate.' using errcode = '22023'; end if;
    if v_plan.currency <> 'USD' then raise exception 'Crypto quotes currently require a USD plan.' using errcode = '22023'; end if;
    v_quote := round(p_amount / v_wallet.quote_usd_per_unit, 18);
    if v_quote <= 0 then raise exception 'This amount is too small for the selected crypto quote.' using errcode = '22023'; end if;
    insert into public.transaction_requests(id,user_id,kind,amount,currency,plan_id,status,payment_method,payment_asset,payment_network,payment_quote_amount,payment_quote_expires_at)
    values (v_id,v_user_id,'investment',p_amount,v_plan.currency,v_plan.id,'pending_payment','crypto',v_wallet.asset,v_wallet.network,v_quote,now()+interval '90 minutes');
  elsif p_payment_method = 'bank' then
    select * into v_bank from public.bank_payment_accounts where id = p_bank_account_id and enabled;
    if not found then raise exception 'Choose an enabled bank payment account.' using errcode = '22023'; end if;
    if v_bank.currency <> v_plan.currency then raise exception 'The bank account currency must match the selected plan.' using errcode = '22023'; end if;
    insert into public.transaction_requests(id,user_id,kind,amount,currency,plan_id,status,payment_method,bank_payment_account_id,payment_quote_amount,payment_quote_expires_at,payment_reference)
    values (v_id,v_user_id,'investment',p_amount,v_plan.currency,v_plan.id,'pending_payment','bank',v_bank.id,p_amount,now()+interval '24 hours','INV-'||upper(substr(replace(v_id::text,'-',''),1,10)));
  else
    raise exception 'Choose crypto or bank transfer.' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

create or replace function public.submit_bank_payment(p_request_id uuid, p_reference text)
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
  if length(trim(coalesce(p_reference,''))) < 3 then raise exception 'Enter a bank transfer reference or receipt identifier.' using errcode = '22023'; end if;
  select * into v_request from public.transaction_requests where id=p_request_id and user_id=v_user_id and kind='investment' for update;
  if not found or v_request.status <> 'pending_payment' or v_request.payment_method <> 'bank' then raise exception 'This request is not awaiting a bank transfer.' using errcode = '22023'; end if;
  if v_request.payment_quote_expires_at <= now() then
    update public.transaction_requests set status='expired' where id=p_request_id;
    raise exception 'Payment quote expired. Start a new request.' using errcode = '22023';
  end if;
  update public.transaction_requests set payment_tx_hash=trim(p_reference),status='pending_review' where id=p_request_id;
end;
$$;

create or replace function public.cancel_transaction_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.transaction_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required.' using errcode = '42501'; end if;
  select * into v_request from public.transaction_requests where id=p_request_id and user_id=auth.uid() for update;
  if not found then raise exception 'Request not found.' using errcode = '22023'; end if;
  if not ((v_request.kind='investment' and v_request.status='pending_payment') or (v_request.kind='withdrawal' and v_request.status='pending_review')) then
    raise exception 'This request can no longer be cancelled.' using errcode = '22023';
  end if;
  update public.transaction_requests set status='cancelled' where id=v_request.id;
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
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision.' using errcode = '22023'; end if;
  select * into v_request from public.transaction_requests where id=p_request_id for update;
  if not found or v_request.status <> 'pending_review' then raise exception 'Request is not awaiting review.' using errcode = '22023'; end if;
  if p_decision='approved' and v_request.kind='investment' then
    if v_request.payment_method='bank' then
      if v_request.payment_tx_hash is null then raise exception 'A submitted bank transfer receipt or reference is required.' using errcode = '22023'; end if;
    else
      if p_asset is null or p_network is null or p_asset <> v_request.payment_asset or p_network <> v_request.payment_network then
        raise exception 'Select the asset and network that match the submitted transaction.' using errcode = '22023';
      end if;
      if v_request.payment_tx_hash is null or not exists(select 1 from public.deposit_reconciliations d where d.request_id=v_request.id and d.asset=p_asset and d.network=p_network and d.transaction_hash=v_request.payment_tx_hash) then
        raise exception 'Record and verify the actual on-chain deposit before approving this investment.' using errcode = '22023';
      end if;
    end if;
  end if;
  update public.transaction_requests set status=p_decision,officer_id=auth.uid(),reviewed_at=now() where id=p_request_id;
  if p_decision='approved' and v_request.kind='investment' then
    select * into v_plan from public.investment_plans where id=v_request.plan_id;
    insert into public.investment_positions(request_id,user_id,plan_id,principal,annual_rate_percent,term_months,currency)
    values (v_request.id,v_request.user_id,v_plan.id,v_request.amount,v_plan.annual_rate_percent,v_plan.term_months,v_request.currency);
  end if;
end;
$$;

revoke all on function public.create_investment_payment_request(text,numeric,text,uuid,uuid) from public, anon;
revoke all on function public.submit_bank_payment(uuid,text) from public, anon;
revoke all on function public.cancel_transaction_request(uuid) from public, anon;
revoke all on function public.officer_decide_transaction(uuid,text,text,text) from public, anon;
grant execute on function public.create_investment_payment_request(text,numeric,text,uuid,uuid) to authenticated;
grant execute on function public.submit_bank_payment(uuid,text) to authenticated;
grant execute on function public.cancel_transaction_request(uuid) to authenticated;
grant execute on function public.officer_decide_transaction(uuid,text,text,text) to authenticated;
