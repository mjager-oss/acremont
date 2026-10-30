create table if not exists public.investment_position_accrual_adjustments (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.investment_positions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  previous_amount numeric(20,2) not null check (previous_amount >= 0),
  target_amount numeric(20,2) not null check (target_amount >= 0),
  adjustment_amount numeric(20,2) not null check (adjustment_amount <> 0),
  reason text not null check (length(trim(reason)) between 10 and 1000),
  officer_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists investment_position_accrual_adjustments_position_created
  on public.investment_position_accrual_adjustments(position_id, created_at desc);

alter table public.investment_position_accrual_adjustments enable row level security;
create policy "officers read accrual adjustment history"
  on public.investment_position_accrual_adjustments for select to authenticated
  using (public.is_investment_officer());
revoke all on public.investment_position_accrual_adjustments from anon, authenticated;
grant select on public.investment_position_accrual_adjustments to authenticated;

create or replace function public.position_accrual_adjustment_total(p_position_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if not public.is_investment_officer() and not exists (
    select 1 from public.investment_positions p
    where p.id = p_position_id and p.user_id = auth.uid()
  ) then
    raise exception 'Position access denied.' using errcode = '42501';
  end if;
  select coalesce(sum(a.adjustment_amount), 0)::numeric into v_total
  from public.investment_position_accrual_adjustments a
  where a.position_id = p_position_id;
  return v_total;
end;
$$;
revoke all on function public.position_accrual_adjustment_total(uuid) from public, anon;
grant execute on function public.position_accrual_adjustment_total(uuid) to authenticated;

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
  (coalesce(ledger.total_gain, 0) + coalesce(adjustments.total_adjustment, 0))::numeric as accrued_gain
from public.investment_positions p
left join lateral (
  select sum(l.accrued_gain) as total_gain
  from public.investment_position_accruals_ledger l
  where l.position_id = p.id
) ledger on true
left join lateral (
  select public.position_accrual_adjustment_total(p.id) as total_adjustment
) adjustments on true
where p.status in ('active', 'matured');

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
  v_previous numeric(20,2);
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

  v_previous := greatest(0, v_ledger_total + v_adjustment_total);
  v_delta := p_target_amount::numeric(20,2) - v_previous;
  if v_delta <> 0 then
    insert into public.investment_position_accrual_adjustments(
      position_id, user_id, currency, previous_amount, target_amount,
      adjustment_amount, reason, officer_id
    ) values (
      v_position.id, v_position.user_id, v_position.currency, v_previous,
      p_target_amount::numeric(20,2), v_delta, trim(p_reason), auth.uid()
    );
  end if;
  return p_target_amount::numeric(20,2);
end;
$$;

revoke all on function public.officer_set_position_accrued_gain(uuid, numeric, text) from public, anon;
grant execute on function public.officer_set_position_accrued_gain(uuid, numeric, text) to authenticated;
