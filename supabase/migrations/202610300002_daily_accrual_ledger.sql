create table if not exists public.investment_position_accruals_ledger (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.investment_positions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  accrual_date date not null,
  accrued_gain numeric(20,2) not null check (accrued_gain >= 0),
  created_at timestamptz not null default now(),
  unique (position_id, accrual_date)
);

alter table public.investment_position_accruals_ledger enable row level security;
create policy "investors read own accrual ledger"
  on public.investment_position_accruals_ledger for select to authenticated
  using (auth.uid() = user_id or public.is_investment_officer());
revoke all on public.investment_position_accruals_ledger from anon, authenticated;
grant select on public.investment_position_accruals_ledger to authenticated;

create or replace function public.accrue_investment_positions()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows bigint;
begin
  insert into public.investment_position_accruals_ledger
    (position_id, user_id, currency, accrual_date, accrued_gain)
  select p.id, p.user_id, p.currency, dates.accrual_date,
    greatest(0,
      round((p.principal * (p.annual_rate_percent / 100) *
        (extract(epoch from (least((dates.accrual_date::date + 1)::timestamptz, p.starts_at + make_interval(months => p.term_months)) - p.starts_at)) / 86400 / 365.25))::numeric, 2)
      - round((p.principal * (p.annual_rate_percent / 100) *
        (extract(epoch from (least(dates.accrual_date::date::timestamptz, p.starts_at + make_interval(months => p.term_months)) - p.starts_at)) / 86400 / 365.25))::numeric, 2)
    )
  from public.investment_positions p
  cross join lateral generate_series(
    p.starts_at::date,
    least(current_date - 1, (p.starts_at + make_interval(months => p.term_months))::date),
    interval '1 day'
  ) as dates(accrual_date)
  where p.status in ('active', 'matured')
    and dates.accrual_date < (p.starts_at + make_interval(months => p.term_months))::date + 1
  on conflict (position_id, accrual_date) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function public.accrue_investment_positions() from public, anon, authenticated;
grant execute on function public.accrue_investment_positions() to service_role;

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
  coalesce(sum(l.accrued_gain), 0)::numeric as accrued_gain
from public.investment_positions p
left join public.investment_position_accruals_ledger l on l.position_id = p.id
where p.status in ('active', 'matured')
group by p.id;

grant select on public.investment_position_accruals to authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'daily-investment-position-accrual',
    '5 0 * * *',
    'select public.accrue_investment_positions();'
  );
exception when insufficient_privilege or undefined_file then
  raise notice 'pg_cron could not be enabled. Schedule public.accrue_investment_positions() from the Supabase dashboard or an authorized server job.';
end;
$$;
