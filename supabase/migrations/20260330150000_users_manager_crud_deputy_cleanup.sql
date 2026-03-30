-- Apstiprinātāja termiņa beigas: automātiski notīra DB (izsauc klients ar RPC).
-- Vadītājs/admin: CRUD uz public.users (sinhronizācija ar komandas tabulu).

create or replace function public.pdd_cleanup_expired_deputy()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Beidzies termiņš → atpakaļ uz pamatvadītāju
  update public.pdd_deputy_state
  set
    deputy_user_id = null,
    deputy_valid_from = null,
    deputy_valid_to = null,
    updated_at = now()
  where id = 1
    and deputy_user_id is not null
    and deputy_valid_to is not null
    and deputy_valid_to < current_date;

  -- Nepilnīgs termiņš (bez no/līdz) vairs nav atļauts
  update public.pdd_deputy_state
  set
    deputy_user_id = null,
    deputy_valid_from = null,
    deputy_valid_to = null,
    updated_at = now()
  where id = 1
    and deputy_user_id is not null
    and (deputy_valid_from is null or deputy_valid_to is null);
end;
$$;

revoke all on function public.pdd_cleanup_expired_deputy() from public;
grant execute on function public.pdd_cleanup_expired_deputy() to authenticated;

drop policy if exists "users_update_manager" on public.users;
create policy "users_update_manager" on public.users
  for update to authenticated
  using (
    exists (
      select 1 from public.users m
      where m.id = auth.uid() and m.role in ('manager', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.users m
      where m.id = auth.uid() and m.role in ('manager', 'admin')
    )
  );

drop policy if exists "users_insert_manager" on public.users;
create policy "users_insert_manager" on public.users
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users m
      where m.id = auth.uid() and m.role in ('manager', 'admin')
    )
    and exists (select 1 from auth.users au where au.id = id)
  );

drop policy if exists "users_delete_manager" on public.users;
create policy "users_delete_manager" on public.users
  for delete to authenticated
  using (
    exists (
      select 1 from public.users m
      where m.id = auth.uid() and m.role in ('manager', 'admin')
    )
    and id <> auth.uid()
  );
