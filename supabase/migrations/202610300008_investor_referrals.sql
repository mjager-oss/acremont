alter table public.investor_profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.investor_profiles(user_id) on delete set null;

-- Keep attribution server controlled while allowing existing profile edits.
revoke insert, update on public.investor_profiles from authenticated;
grant insert (user_id, email, full_name, phone),
  update (user_id, email, full_name, phone)
  on public.investor_profiles to authenticated;

create unique index if not exists investor_profiles_referral_code_unique
  on public.investor_profiles(referral_code)
  where referral_code is not null;

create or replace function public.get_my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_code text;
begin
  select u.raw_app_meta_data ->> 'role'
    into v_role
  from auth.users u
  where u.id = auth.uid();

  if coalesce(v_role, '') <> 'investment_officer' then
    raise exception 'Authorized investment agent access required.' using errcode = '42501';
  end if;

  update public.investor_profiles p
  set referral_code = coalesce(
    p.referral_code,
    lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
  )
  where p.user_id = auth.uid()
  returning p.referral_code into v_code;

  if v_code is null then
    raise exception 'Investor profile not found.' using errcode = 'P0002';
  end if;

  return v_code;
end;
$$;

revoke all on function public.get_my_referral_code() from public, anon;
grant execute on function public.get_my_referral_code() to authenticated;

create or replace function public.sync_investor_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer_id uuid;
  v_referral_code text;
begin
  v_referral_code := nullif(trim(new.raw_user_meta_data ->> 'referral_code'), '');

  if v_referral_code is not null then
    select p.user_id into v_referrer_id
    from public.investor_profiles p
    join auth.users agent on agent.id = p.user_id
    where p.referral_code = v_referral_code
      and p.user_id <> new.id
      and agent.raw_app_meta_data ->> 'role' = 'investment_officer'
    limit 1;
  end if;

  insert into public.investor_profiles(user_id, email, full_name, phone, referred_by)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    v_referrer_id
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      phone = excluded.phone,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.sync_investor_profile();
