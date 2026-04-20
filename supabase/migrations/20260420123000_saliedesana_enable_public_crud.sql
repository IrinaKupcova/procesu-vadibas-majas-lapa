-- Saliedesana: atļaujam lietotnei lasīt/veidot/labot/dzēst ierakstus.
-- Vajadzīgs, lai Saliedesana.js sinhronizācija ar DB strādātu visiem lietotājiem.

alter table if exists public."Saliedesana" enable row level security;

drop policy if exists "saliedesana_select_public" on public."Saliedesana";
drop policy if exists "saliedesana_insert_public" on public."Saliedesana";
drop policy if exists "saliedesana_update_public" on public."Saliedesana";
drop policy if exists "saliedesana_delete_public" on public."Saliedesana";

create policy "saliedesana_select_public"
on public."Saliedesana"
for select
to anon, authenticated
using (true);

create policy "saliedesana_insert_public"
on public."Saliedesana"
for insert
to anon, authenticated
with check (true);

create policy "saliedesana_update_public"
on public."Saliedesana"
for update
to anon, authenticated
using (true)
with check (true);

create policy "saliedesana_delete_public"
on public."Saliedesana"
for delete
to anon, authenticated
using (true);

