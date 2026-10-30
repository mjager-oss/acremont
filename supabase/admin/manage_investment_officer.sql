-- Run in the Supabase SQL Editor as an administrator.
-- Set exactly one lookup value. For email lookup, the account must already exist.
do $$
declare
  target_user_id uuid := null;
  target_email text := 'officer@example.com';
  grant_officer boolean := true;
  resolved_user_id uuid;
  matched_users integer;
begin
  if (target_user_id is null) = (nullif(trim(target_email), '') is null) then
    raise exception 'Set exactly one of target_user_id or target_email.';
  end if;

  if target_user_id is not null then
    select id into resolved_user_id
    from auth.users
    where id = target_user_id;
  else
    select count(*), min(id::text)::uuid
      into matched_users, resolved_user_id
    from auth.users
    where lower(email) = lower(trim(target_email));

    if matched_users > 1 then
      raise exception 'More than one account matches this email. Use its user ID instead.';
    end if;
  end if;

  if resolved_user_id is null then
    raise exception 'No auth.users account matches the supplied user ID or email.';
  end if;

  if grant_officer then
    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', 'investment_officer')
      where id = resolved_user_id;
    raise notice 'Investment officer role granted to user %.', resolved_user_id;
  else
    update auth.users
      set raw_app_meta_data = case
        when raw_app_meta_data ->> 'role' = 'investment_officer'
          then coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
        else coalesce(raw_app_meta_data, '{}'::jsonb)
      end
      where id = resolved_user_id;
    raise notice 'Investment officer role revoked from user %.', resolved_user_id;
  end if;
end;
$$;
