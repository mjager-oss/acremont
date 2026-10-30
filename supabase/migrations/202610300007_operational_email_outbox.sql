create table if not exists public.operational_email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('transaction_request', 'payout_method')),
  entity_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists operational_email_outbox_pending
  on public.operational_email_outbox(status, created_at)
  where status in ('pending', 'failed');
create index if not exists operational_email_outbox_entity
  on public.operational_email_outbox(entity_type, entity_id, created_at desc);

alter table public.operational_email_outbox enable row level security;
revoke all on public.operational_email_outbox from public, anon, authenticated;
grant select, insert, update on public.operational_email_outbox to service_role;

create or replace function public.enqueue_transaction_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text;
  v_plan_name text;
  v_payload jsonb;
begin
  if tg_op = 'UPDATE' and (
    old.status is not distinct from new.status
    and old.payment_reference is not distinct from new.payment_reference
    and old.payment_tx_hash is not distinct from new.payment_tx_hash
  ) then
    return new;
  end if;

  select p.name into v_plan_name
  from public.investment_plans p
  where p.id = new.plan_id;

  v_event_type := case
    when tg_op = 'INSERT' then 'transaction_created'
    when old.status is distinct from new.status then 'transaction_status_changed'
    else 'transaction_payment_submitted'
  end;

  v_payload := jsonb_build_object(
    'kind', new.kind,
    'amount', new.amount,
    'currency', new.currency,
    'status', new.status,
    'plan_name', v_plan_name,
    'payment_method', new.payment_method,
    'payment_reference', new.payment_reference,
    'created_at', new.created_at
  );

  insert into public.operational_email_outbox(
    recipient_user_id, entity_type, entity_id, event_type, payload
  ) values (
    new.user_id, 'transaction_request', new.id, v_event_type, v_payload
  );

  return new;
end;
$$;

drop trigger if exists transaction_email_outbox_insert on public.transaction_requests;
create trigger transaction_email_outbox_insert
  after insert on public.transaction_requests
  for each row execute function public.enqueue_transaction_email();

drop trigger if exists transaction_email_outbox_update on public.transaction_requests;
create trigger transaction_email_outbox_update
  after update of status, payment_reference, payment_tx_hash on public.transaction_requests
  for each row execute function public.enqueue_transaction_email();

create or replace function public.enqueue_payout_method_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text;
begin
  if tg_op = 'DELETE' then
    insert into public.operational_email_outbox(
      recipient_user_id, entity_type, entity_id, event_type, payload
    ) values (
      old.user_id,
      'payout_method',
      old.id,
      'payout_method_removed',
      jsonb_build_object('kind', old.kind, 'status', old.status)
    );
    return old;
  end if;

  if tg_op = 'INSERT' then
    v_event_type := 'payout_method_added';
  elsif old.status is distinct from new.status then
    v_event_type := 'payout_method_status_changed';
  elsif old.kind is distinct from new.kind
     or old.label is distinct from new.label
     or old.details is distinct from new.details
     or old.is_default is distinct from new.is_default then
    v_event_type := 'payout_method_edited';
  else
    return new;
  end if;

  insert into public.operational_email_outbox(
    recipient_user_id, entity_type, entity_id, event_type, payload
  ) values (
    new.user_id,
    'payout_method',
    new.id,
    v_event_type,
    jsonb_build_object('kind', new.kind, 'status', new.status)
  );
  return new;
end;
$$;

drop trigger if exists payout_method_email_outbox on public.payout_methods;
create trigger payout_method_email_outbox
  after insert or update or delete on public.payout_methods
  for each row execute function public.enqueue_payout_method_email();

-- Keep the investor dashboard fresh after transactions or accrual ledger changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'transaction_requests'
    ) then
      execute 'alter publication supabase_realtime add table public.transaction_requests';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'investment_position_accruals_ledger'
    ) then
      execute 'alter publication supabase_realtime add table public.investment_position_accruals_ledger';
    end if;

  end if;
end;
$$;
