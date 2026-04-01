-- Force-enable critical runtime access for PDD page operations.
-- Scope: prombutnes_dati (CRUD needed by page), Auditacijas_vesture (read/write audit trail).

begin;

alter table public.prombutnes_dati enable row level security;
alter table public."Auditacijas_vesture" enable row level security;

-- Drop potentially conflicting policies for prombutnes_dati.
drop policy if exists "prombutnes_select_public" on public.prombutnes_dati;
drop policy if exists "prombutnes_insert_public" on public.prombutnes_dati;
drop policy if exists "prombutnes_update_public" on public.prombutnes_dati;
drop policy if exists "prombutnes_delete_public" on public.prombutnes_dati;
drop policy if exists "prombutnes_select_authenticated" on public.prombutnes_dati;
drop policy if exists "prombutnes_insert_authenticated" on public.prombutnes_dati;
drop policy if exists "prombutnes_update_authenticated" on public.prombutnes_dati;
drop policy if exists "prombutnes_delete_authenticated" on public.prombutnes_dati;
drop policy if exists "prombutnes_select_own_or_manager" on public.prombutnes_dati;
drop policy if exists "prombutnes_insert_own_or_manager" on public.prombutnes_dati;
drop policy if exists "prombutnes_update_own_or_manager" on public.prombutnes_dati;
drop policy if exists "prombutnes_delete_own_or_manager" on public.prombutnes_dati;
drop policy if exists "prombutnes_update_owner_only" on public.prombutnes_dati;
drop policy if exists "prombutnes_delete_owner_only" on public.prombutnes_dati;

create policy "prombutnes_select_public"
on public.prombutnes_dati
as permissive
for select
to public
using (true);

create policy "prombutnes_insert_public"
on public.prombutnes_dati
as permissive
for insert
to public
with check (true);

create policy "prombutnes_update_public"
on public.prombutnes_dati
as permissive
for update
to public
using (true)
with check (true);

create policy "prombutnes_delete_public"
on public.prombutnes_dati
as permissive
for delete
to public
using (true);

-- Audit table policies (page reads + inserts logs).
drop policy if exists "audit_select_public" on public."Auditacijas_vesture";
drop policy if exists "audit_insert_public" on public."Auditacijas_vesture";
drop policy if exists "audit_select_authenticated" on public."Auditacijas_vesture";
drop policy if exists "audit_insert_authenticated" on public."Auditacijas_vesture";
drop policy if exists "audit_select_anon" on public."Auditacijas_vesture";
drop policy if exists "audit_insert_anon" on public."Auditacijas_vesture";

create policy "audit_select_public"
on public."Auditacijas_vesture"
as permissive
for select
to public
using (true);

create policy "audit_insert_public"
on public."Auditacijas_vesture"
as permissive
for insert
to public
with check (true);

commit;
