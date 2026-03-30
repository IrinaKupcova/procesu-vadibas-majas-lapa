-- E-pasta sesija (anon): RLS uz prombutnes_dati / pdd_cits_requests prasa auth.uid().
-- Šīs funkcijas ar security definer apstiprina, ka p_actor id + e-pasts sakrīt ar public.users,
-- un vai nu pieteicējs ir pats, vai arī vadītājs/admin.

create or replace function public.pdd_actor_can_submit_for_others(p_actor_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_actor_user_id
      and lower(trim(coalesce(u.role, ''))) in ('manager', 'admin')
  );
$$;

revoke all on function public.pdd_actor_can_submit_for_others(uuid) from public;
grant execute on function public.pdd_actor_can_submit_for_others(uuid) to anon, authenticated;

create or replace function public.pdd_session_match_actor(p_actor_user_id uuid, p_actor_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_actor_user_id
      and lower(trim(coalesce(p_actor_email, ''))) <> ''
      and position('@' in lower(trim(coalesce(p_actor_email, '')))) > 0
      and (
        lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(p_actor_email, '')))
        or lower(trim(coalesce(u."i-mail", ''))) = lower(trim(coalesce(p_actor_email, '')))
        or lower(trim(coalesce(u."e-mail", ''))) = lower(trim(coalesce(p_actor_email, '')))
      )
  );
$$;

revoke all on function public.pdd_session_match_actor(uuid, text) from public;
grant execute on function public.pdd_session_match_actor(uuid, text) to anon, authenticated;

create or replace function public.pdd_submit_absence_session(
  p_actor_user_id uuid,
  p_actor_email text,
  p_target_user_id uuid,
  p_type_id integer,
  p_start date,
  p_end date,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid;
begin
  if not public.pdd_session_match_actor(p_actor_user_id, p_actor_email) then
    raise exception 'Nederīga sesija: e-pasts nesakrīt ar lietotāju (atkārtoti ieej).';
  end if;

  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Nepareizi datumi';
  end if;

  if not public.pdd_actor_can_submit_for_others(p_actor_user_id) and p_target_user_id <> p_actor_user_id then
    raise exception 'Parastam lietotājam var pieteikt prombūtni tikai sev';
  end if;

  insert into public.prombutnes_dati (
    user_id,
    type_id,
    start_date,
    end_date,
    comment,
    status,
    approved_at,
    approved_by
  )
  values (
    p_target_user_id,
    p_type_id,
    p_start,
    p_end,
    nullif(trim(coalesce(p_comment, '')), ''),
    'approved',
    now(),
    null
  )
  returning id into v_new;

  return v_new;
end;
$$;

comment on function public.pdd_submit_absence_session(uuid, uuid, uuid, int, date, date, text) is
  'PDD: anon e-pasta sesijā ievieto apstiprinātu prombūtni (pāri RLS).';

revoke all on function public.pdd_submit_absence_session(uuid, uuid, uuid, integer, date, date, text) from public;
grant execute on function public.pdd_submit_absence_session(uuid, uuid, uuid, integer, date, date, text) to anon, authenticated;

create or replace function public.pdd_submit_cits_request_session(
  p_actor_user_id uuid,
  p_actor_email text,
  p_target_user_id uuid,
  p_start date,
  p_end date,
  p_comment text,
  p_notify_email text
)
returns table (request_id uuid, approval_token uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.pdd_session_match_actor(p_actor_user_id, p_actor_email) then
    raise exception 'Nederīga sesija: e-pasts nesakrīt ar lietotāju (atkārtoti ieej).';
  end if;

  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Nepareizi datumi';
  end if;

  if trim(coalesce(p_notify_email, '')) = '' or position('@' in p_notify_email) = 0 then
    raise exception 'Nav derīga apstiprinātāja e-pasta';
  end if;

  if not public.pdd_actor_can_submit_for_others(p_actor_user_id) and p_target_user_id <> p_actor_user_id then
    raise exception 'Parastam lietotājam šo veidu var pieteikt tikai sev';
  end if;

  return query
  insert into public.pdd_cits_requests (
    user_id,
    start_date,
    end_date,
    comment,
    notify_email
  )
  values (
    p_target_user_id,
    p_start,
    p_end,
    nullif(trim(coalesce(p_comment, '')), ''),
    trim(p_notify_email)
  )
  returning id as request_id, approval_token;
end;
$$;

comment on function public.pdd_submit_cits_request_session(uuid, uuid, uuid, date, date, text, text) is
  'PDD: anon sesijā izveido „Cits” saskaņošanas pieprasījumu.';

revoke all on function public.pdd_submit_cits_request_session(uuid, uuid, uuid, date, date, text, text) from public;
grant execute on function public.pdd_submit_cits_request_session(uuid, uuid, uuid, date, date, text, text) to anon, authenticated;
