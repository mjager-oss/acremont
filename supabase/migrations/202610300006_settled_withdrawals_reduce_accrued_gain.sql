alter table public.transaction_requests
  add column if not exists paid_at timestamptz;

create or replace view public.investment_position_accruals
with (security_invoker = true)
as
with gross_position_accruals as (
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
    (coalesce(ledger.total_gain, 0) + coalesce(adjustments.total_adjustment, 0))::numeric as gross_accrued_gain
  from public.investment_positions p
  left join lateral (
    select sum(l.accrued_gain) as total_gain
    from public.investment_position_accruals_ledger l
    where l.position_id = p.id
  ) ledger on true
  left join lateral (
    select public.position_accrual_adjustment_total(p.id) as total_adjustment
  ) adjustments on true
  where p.status in ('active', 'matured')
), position_gain_order as (
  select
    g.*,
    coalesce(
      sum(g.gross_accrued_gain) over (
        partition by g.user_id, g.currency
        order by g.starts_at, g.id
        rows between unbounded preceding and 1 preceding
      ),
      0
    ) as preceding_accrued_gain
  from gross_position_accruals g
), paid_withdrawals as (
  select r.user_id, r.currency, sum(r.amount)::numeric as amount_paid
  from public.transaction_requests r
  where r.kind = 'withdrawal' and r.status = 'paid'
  group by r.user_id, r.currency
)
select
  g.id,
  g.request_id,
  g.user_id,
  g.plan_id,
  g.principal,
  g.currency,
  g.annual_rate_percent,
  g.term_months,
  g.starts_at,
  g.accrual_through,
  greatest(
    g.gross_accrued_gain - least(
      g.gross_accrued_gain,
      greatest(coalesce(w.amount_paid, 0) - g.preceding_accrued_gain, 0)
    ),
    0
  )::numeric as accrued_gain
from position_gain_order g
left join paid_withdrawals w
  on w.user_id = g.user_id and w.currency = g.currency;

grant select on public.investment_position_accruals to authenticated;

create or replace function public.officer_set_position_accrued_gain(
  p_position_id uuid,
  p_target_amount numeric,
  p_reason text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_position public.investment_positions%rowtype;
  v_ledger_total numeric(20,2);
  v_adjustment_total numeric(20,2);
  v_prior_gross numeric(20,2);
  v_paid_total numeric(20,2);
  v_paid_for_position numeric(20,2);
  v_previous_net numeric(20,2);
  v_target_gross numeric(20,2);
  v_delta numeric(20,2);
begin
  if not public.is_investment_officer() then
    raise exception 'Investment officer permission required.' using errcode = '42501';
  end if;
  if p_target_amount is null or p_target_amount < 0 then
    raise exception 'Accrued gain must be zero or greater.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 or length(trim(p_reason)) > 1000 then
    raise exception 'Enter a correction reason between 10 and 1000 characters.' using errcode = '22023';
  end if;

  select * into v_position
  from public.investment_positions
  where id = p_position_id and status in ('active', 'matured')
  for update;
  if not found then
    raise exception 'Active or matured investment position not found.' using errcode = '22023';
  end if;

  select coalesce(sum(l.accrued_gain), 0)::numeric(20,2)
    into v_ledger_total
  from public.investment_position_accruals_ledger l
  where l.position_id = v_position.id;
  select coalesce(sum(a.adjustment_amount), 0)::numeric(20,2)
    into v_adjustment_total
  from public.investment_position_accrual_adjustments a
  where a.position_id = v_position.id;

  select coalesce(sum(
    coalesce(ledger.total_gain, 0) + coalesce(adjustments.total_adjustment, 0)
  ), 0)::numeric(20,2)
  into v_prior_gross
  from public.investment_positions prior_position
  left join lateral (
    select sum(l.accrued_gain) as total_gain
    from public.investment_position_accruals_ledger l
    where l.position_id = prior_position.id
  ) ledger on true
  left join lateral (
    select public.position_accrual_adjustment_total(prior_position.id) as total_adjustment
  ) adjustments on true
  where prior_position.user_id = v_position.user_id
    and prior_position.currency = v_position.currency
    and prior_position.status in ('active', 'matured')
    and (prior_position.starts_at, prior_position.id) < (v_position.starts_at, v_position.id);

  select coalesce(sum(r.amount), 0)::numeric(20,2)
  into v_paid_total
  from public.transaction_requests r
  where r.user_id = v_position.user_id
    and r.currency = v_position.currency
    and r.kind = 'withdrawal'
    and r.status = 'paid';

  v_paid_for_position := greatest(v_paid_total - v_prior_gross, 0);
  v_previous_net := greatest(
    v_ledger_total + v_adjustment_total - least(v_ledger_total + v_adjustment_total, v_paid_for_position),
    0
  );
  v_target_gross := p_target_amount::numeric(20,2) + v_paid_for_position;
  v_delta := v_target_gross - v_ledger_total - v_adjustment_total;

  if v_delta <> 0 then
    insert into public.investment_position_accrual_adjustments(
      position_id, user_id, currency, previous_amount, target_amount,
      adjustment_amount, reason, officer_id
    ) values (
      v_position.id, v_position.user_id, v_position.currency, v_previous_net,
      p_target_amount::numeric(20,2), v_delta, trim(p_reason), auth.uid()
    );
  end if;
  return p_target_amount::numeric(20,2);
end;
$$;

revoke all on function public.officer_set_position_accrued_gain(uuid, numeric, text) from public, anon;
grant execute on function public.officer_set_position_accrued_gain(uuid, numeric, text) to authenticated;

create or replace function public.officer_mark_withdrawal_paid(p_request_id uuid)
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

  select * into v_request
  from public.transaction_requests
  where id = p_request_id
  for update;

  if not found or v_request.kind <> 'withdrawal' or v_request.status <> 'approved' then
    raise exception 'Only an approved withdrawal can be marked paid.' using errcode = '22023';
  end if;

  update public.transaction_requests
  set status = 'paid', paid_at = now(), officer_id = auth.uid()
  where id = v_request.id;
end;
$$;

revoke all on function public.officer_mark_withdrawal_paid(uuid) from public, anon;
grant execute on function public.officer_mark_withdrawal_paid(uuid) to authenticated;
