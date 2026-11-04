-- Run in the Supabase SQL Editor as an administrator.
-- Add the email addresses of existing Supabase Auth users to this list.
-- The block validates every address before granting any roles.
do $$
declare
  target_emails text[] := array[
    'officer@example.com'
  ];
  normalized_emails text[];
  requested_count integer;
  matched_count integer;
  invalid_count integer;
begin
  select array_agg(distinct lower(trim(email)))
    into normalized_emails
  from unnest(target_emails) as input(email)
  where nullif(trim(email), '') is not null;

  requested_count := coalesce(cardinality(normalized_emails), 0);
  if requested_count = 0 then
    raise exception 'Add at least one email address to target_emails.';
  end if;

  select count(*) filter (where matching_users = 1),
         count(*) filter (where matching_users <> 1)
    into matched_count, invalid_count
  from (
    select requested.email,
           (select count(*) from auth.users u where lower(u.email) = requested.email) as matching_users
    from unnest(normalized_emails) as requested(email)
  ) checked_emails;

  if invalid_count > 0 then
    raise exception '% email address(es) do not match exactly one Supabase Auth user. Check for missing or duplicate accounts.', invalid_count;
  end if;

  update auth.users u
    set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'investment_officer')
  where lower(u.email) = any(normalized_emails);

  raise notice 'Granted investment_officer to % account(s).', matched_count;
end;
$$;
