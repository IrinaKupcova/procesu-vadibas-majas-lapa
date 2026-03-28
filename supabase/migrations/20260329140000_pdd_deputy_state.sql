-- E-pasts public.users (paziņojumiem); vadītāja p.i. (viena persona visai komandai)

alter table public.users add column if not exists email text;

update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and (u.email is null or btrim(u.email) = '');

create table if not exists public.pdd_deputy_state (
  id smallint primary key default 1 check (id = 1),
  deputy_user_id uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

insert into public.pdd_deputy_state (id, deputy_user_id)
values (1, null)
on conflict (id) do nothing;

alter table public.pdd_deputy_state enable row level security;

drop policy if exists "pdd_deputy_state_select" on public.pdd_deputy_state;
create policy "pdd_deputy_state_select" on public.pdd_deputy_state
  for select to authenticated using (true);

drop policy if exists "pdd_deputy_state_update" on public.pdd_deputy_state;
create policy "pdd_deputy_state_update" on public.pdd_deputy_state
  for update to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('manager', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('manager', 'admin')
    )
    and (
      deputy_user_id is null
      or exists (select 1 from public.users du where du.id = deputy_user_id)
    )
  );

drop policy if exists "pdd_deputy_state_insert" on public.pdd_deputy_state;
create policy "pdd_deputy_state_insert" on public.pdd_deputy_state
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('manager', 'admin')
    )
  );

-- Sinhronizē e-pastu, ja auth lietotājs to maina
create or replace function public.sync_users_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute procedure public.sync_users_email_from_auth();
