    -- Kolonnas kā PDD Supabase projektā: Vārds uzvārds, i-mail, Amats.
    -- Ja jau eksistē (kā produkcijā), ADD IF NOT EXISTS neko nemaina.

    alter table public.users add column if not exists "Amats" text;
    alter table public.users add column if not exists "Vārds uzvārds" text;
    alter table public.users add column if not exists "i-mail" text;

    update public.users u
    set
      "Vārds uzvārds" = coalesce(nullif(trim(u."Vārds uzvārds"), ''), u.full_name)
    where u.full_name is not null
      and (u."Vārds uzvārds" is null or btrim(u."Vārds uzvārds") = '');

    update public.users u
    set
      "i-mail" = coalesce(nullif(trim(u."i-mail"), ''), u.email)
    where u.email is not null
      and (u."i-mail" is null or btrim(u."i-mail") = '');

    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    declare
      v_fn text;
      v_ln text;
      v_full text;
      v_disp text;
    begin
      v_fn := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
      v_ln := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
      v_full := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
      if v_full is null and (v_fn is not null or v_ln is not null) then
        v_full := trim(concat_ws(' ', v_fn, v_ln));
      end if;
      v_disp := coalesce(v_full, split_part(new.email, '@', 1));
      insert into public.users (id, full_name, role, email, "Vārds uzvārds", "i-mail")
      values (
        new.id,
        v_disp,
        coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'employee'),
        new.email,
        v_disp,
        new.email
      );
      return new;
    end;
    $$;
