-- PDD: salāgošana ar tipiskām dzīvajām tabulām (e-mail, type, apstiprinajuma_statuss, u.c.)
-- un RPC, lai anon e-pasta sesija + „Cits” apstiprinājums strādā pret faktisko shēmu.

create table if not exists public.pdd_deputy_state (
  id smallint primary key default 1 check (id = 1),
  deputy_user_id uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.pdd_deputy_state (id, deputy_user_id)
values (1, null)
on conflict (id) do nothing;

-- Kolonnas, kuras bieži ir manuālā DB, bet nav sākotnējā seed
alter table public.prombutnes_dati
  add column if not exists apstiprinajuma_statuss text;

alter table public.prombutnes_veidi
  add column if not exists name text;

-- Sinhronizē name no kolonnas type (tikai ja kolonna „type” eksistē)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prombutnes_veidi' and column_name = 'type'
  ) then
    update public.prombutnes_veidi v
    set name = nullif(trim(coalesce(v.type::text, '')), '')
    where (v.name is null or trim(v.name) = '') and v.type is not null;
  end if;
end $$;

alter table public.users
  add column if not exists "e-pasts" text;

-- Ja DB vecāka par 20260330120000 migrāciju: bez šīm kolonnām CREATE FUNCTION pdd_can_approve_absences met ar 42703
alter table public.pdd_deputy_state
  add column if not exists deputy_valid_from date,
  add column if not exists deputy_valid_to date;

-- Vadītājs DB: role = 'Admin' — salīdzināšanai izmantojam lower(trim(...))
create or replace function public.pdd_can_approve_absences()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      exists (
        select 1 from public.users u
        where u.id = auth.uid()
          and lower(trim(coalesce(u.role, ''))) in ('manager', 'admin')
      ),
      false
    )
    or coalesce(
      exists (
        select 1 from public.pdd_deputy_state d
        where d.id = 1
          and d.deputy_user_id is not null
          and d.deputy_user_id = auth.uid()
          and (d.deputy_valid_from is null or current_date >= d.deputy_valid_from)
          and (d.deputy_valid_to is null or current_date <= d.deputy_valid_to)
      ),
      false
    );
$$;

revoke all on function public.pdd_can_approve_absences() from public;
grant execute on function public.pdd_can_approve_absences() to authenticated;

-- E-pasta ieeja: papildu lauki „e-pasts”, „e-mail”, „i-mail”
create or replace function public.pdd_lookup_user_by_email(p_email text)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_norm text;
begin
  v_norm := lower(trim(coalesce(p_email, '')));
  if v_norm = '' or position('@' in v_norm) = 0 then
    return;
  end if;

  return query
  select u.id
  from public.users u
  where lower(trim(coalesce(u.email, ''))) = v_norm
     or lower(trim(coalesce(u."i-mail", ''))) = v_norm
     or lower(trim(coalesce(u."e-mail", ''))) = v_norm
     or lower(trim(coalesce(u."e-pasts", ''))) = v_norm
  limit 1;
end;
$$;

comment on function public.pdd_lookup_user_by_email(text) is
  'PDD: public.users.id pēc darba e-pasta (anon ieeja).';

revoke all on function public.pdd_lookup_user_by_email(text) from public;
grant execute on function public.pdd_lookup_user_by_email(text) to anon, authenticated;

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
        or lower(trim(coalesce(u."e-pasts", ''))) = lower(trim(coalesce(p_actor_email, '')))
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

  if not exists (select 1 from public.prombutnes_veidi v where v.id = p_type_id) then
    raise exception 'Nederīgs prombūtnes veida ID (prombutnes_veidi).';
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
    approved_by,
    apstiprinajuma_statuss
  )
  values (
    p_target_user_id,
    p_type_id,
    p_start,
    p_end,
    nullif(trim(coalesce(p_comment, '')), ''),
    'approved',
    now(),
    null,
    'apstiprināts'
  )
  returning id into v_new;

  return v_new;
end;
$$;

comment on function public.pdd_submit_absence_session(uuid, uuid, uuid, integer, date, date, text) is
  'PDD: anon e-pasta sesijā ievieto apstiprinātu prombūtni.';

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
  'PDD: anon sesijā izveido „Cits” pieprasījumu.';

revoke all on function public.pdd_submit_cits_request_session(uuid, uuid, uuid, date, date, text, text) from public;
grant execute on function public.pdd_submit_cits_request_session(uuid, uuid, uuid, date, date, text, text) to anon, authenticated;

-- „Cits” apstiprinājums pēc tokena: meklē veidu pēc name VAI type
create or replace function public.pdd_approve_cits_token(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rid uuid;
  v_uid uuid;
  v_start date;
  v_end date;
  v_comment text;
  v_type_id int;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nepieciešama autentifikācija.';
  end if;
  if not (select public.pdd_can_approve_absences()) then
    raise exception 'Apstiprināt drīkst tikai vadītājs, administrators vai aktuālais p.i.';
  end if;

  select r.id, r.user_id, r.start_date, r.end_date, r.comment
  into v_rid, v_uid, v_start, v_end, v_comment
  from public.pdd_cits_requests r
  where r.approval_token = p_token and r.status = 'pending_manager'
  for update;

  if v_rid is null then
    raise exception 'Nederīgs vai jau apstrādāts tokens';
  end if;

  select v.id into v_type_id
  from public.prombutnes_veidi v
  where coalesce(nullif(trim(v.name), ''), nullif(trim(v.type::text), '')) = 'Cits (ar vadītāja saskaņojumu)'
  limit 1;

  if v_type_id is null then
    select v.id into v_type_id
    from public.prombutnes_veidi v
    where coalesce(nullif(trim(v.name), ''), nullif(trim(v.type::text), '')) ilike '%cits%vadītāja%saskaņ%'
    limit 1;
  end if;

  if v_type_id is null then
    raise exception 'Nav atrasts veids „Cits (ar vadītāja saskaņojumu)” (kolonnas name/type).';
  end if;

  insert into public.prombutnes_dati (
    user_id, type_id, start_date, end_date, comment, status, approved_at, apstiprinajuma_statuss
  )
  values (
    v_uid, v_type_id, v_start, v_end, v_comment, 'approved', now(), 'apstiprināts'
  )
  returning id into v_new_id;

  update public.pdd_cits_requests
  set status = 'approved', approved_absence_id = v_new_id
  where id = v_rid;

  return v_new_id;
end;
$$;

revoke all on function public.pdd_approve_cits_token(uuid) from public;
grant execute on function public.pdd_approve_cits_token(uuid) to anon, authenticated;
