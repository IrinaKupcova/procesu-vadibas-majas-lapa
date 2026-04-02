-- Restrict Komanda tabulas CRUD: tikai Admin drīkst labot/dzēst/pievienot (caur lapu).
-- Parastam lietotājam (role != 'admin') nedrīkst būt update/delete/insert tiesības.

begin;

alter table public.users enable row level security;

-- Noņemam VISAS INSERT/UPDATE/DELETE politikas, lai nepaliek konflikti
-- (select ļaujam pēc esošajām).
do $$
declare
  p record;
begin
  for p in
    select policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  loop
    execute format('drop policy if exists %I on public.users', p.policyname);
  end loop;
end $$;

-- Iepriekšējā migrācijā var būt “anonam viss atļauts” (pdd_anon_users_all).
-- Ja šī policy paliek, parastam lietotājam varētu tikt atļauts CRUD.
drop policy if exists pdd_anon_users_all on public.users;

create policy "users_insert_admin"
  on public.users
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  );

create policy "users_insert_admin_anon"
  on public.users
  for insert to anon
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  );

create policy "users_update_admin"
  on public.users
  for update to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  );

create policy "users_update_admin_anon"
  on public.users
  for update to anon
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  );

create policy "users_delete_admin"
  on public.users
  for delete to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  );

create policy "users_delete_admin_anon"
  on public.users
  for delete to anon
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.role, ''))) in ('admin', 'manager')
    )
  );

-- update/insert/del politikas lieto EXISTS ar public.users u,
-- tāpēc anonam vajag atļaut vismaz savu rindu SELECT (citādi EXISTS var būt tukšs).
drop policy if exists "users_select_anon_self" on public.users;
create policy "users_select_anon_self"
  on public.users
  for select to anon
  using (id = auth.uid());

commit;

