-- PDD aplikācija: profili, prombūtnes veidi, pieteikumi (pending → apstiprināts/noraidīts)
-- Palaid Supabase → SQL Editor → ielīmē un „Run”.
--
-- Pēc pirmā lietotāja izveides — piešķir vadītāja lomu (aizstāj UUID):
--   update public.profiles set role = 'manager' where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

create extension if not exists "pgcrypto";

-- Profils (1:1 ar auth.users). Lomu „manager” piešķir manuāli vai caur SQL.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  created_at timestamptz not null default now()
);

create table public.prombutnes_veidi (
  id serial primary key,
  name text not null unique,
  color text not null default '#4f46e5',
  sort_order int not null default 0
);

create table public.prombutnes_dati (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type_id int not null references public.prombutnes_veidi (id),
  start_date date not null,
  end_date date not null,
  comment text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_prombutnes_dati_range on public.prombutnes_dati (start_date, end_date);
create index idx_prombutnes_dati_user on public.prombutnes_dati (user_id);

-- Jauns lietotājs → profils
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'employee')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Sākuma veidi (latviski)
insert into public.prombutnes_veidi (name, color, sort_order) values
  ('Atvaļinājums', '#2563eb', 1),
  ('Papildatvaļinājums', '#7c3aed', 2),
  ('Komandējums', '#0891b2', 3),
  ('Mācības', '#059669', 4),
  ('Slimības lapa', '#dc2626', 5),
  ('Neapmaksāta prombūtne', '#ca8a04', 6),
  ('Cits (saskaņots)', '#64748b', 7)
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.prombutnes_veidi enable row level security;
alter table public.prombutnes_dati enable row level security;

-- Profili: lasīt visi autentificētie (komandas kalendāram); atjaunot tikai savu rindu
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Veidi: lasīt visi; mainīt tikai service role (šeit — ļaut lasīt visiem)
create policy "prombutnes_veidi_select" on public.prombutnes_veidi
  for select to authenticated using (true);

-- Prombūtnes: visas rindas redzamas komandai
create policy "prombutnes_select" on public.prombutnes_dati
  for select to authenticated using (true);

create policy "prombutnes_insert_own" on public.prombutnes_dati
  for insert to authenticated with check (auth.uid() = user_id);

-- Darbinieks drīkst labot tikai savus gaidošos pieteikumus
create policy "prombutnes_update_own_pending" on public.prombutnes_dati
  for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

-- Vadītājs: drīkst mainīt status/laukas apstiprinājumam
create policy "prombutnes_manager_approve" on public.prombutnes_dati
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('manager', 'admin')
    )
  );
