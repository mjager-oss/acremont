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
    if not found then raise exception 'Choose an enabled crypto wallet with a live quote rate.' using errcode = '22023'; end if;
    if v_plan.currency <> 'USD' then raise exception 'Crypto quotes currently require a USD plan.' using errcode = '22023'; end if;
    v_quote := round(p_amount / v_wallet.quote_usd_per_unit, 18);
    if v_quote <= 0 then raise exception 'This amount is too small for the selected crypto quote.' using errcode = '22023'; end if;
    insert into public.transaction_requests(id,user_id,kind,amount,currency,plan_id,status,payment_method,payment_asset,payment_network,payment_quote_amount,payment_quote_expires_at)
    values (v_id,v_user_id,'investment',p_amount,v_plan.currency,v_plan.id,'pending_payment','crypto',v_wallet.asset,v_wallet.network,v_quote,now()+interval '15 minutes');
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

revoke all on function public.create_investment_payment_request(text,numeric,text,uuid,uuid) from public, anon;
grant execute on function public.create_investment_payment_request(text,numeric,text,uuid,uuid) to authenticated;
