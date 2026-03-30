-- Sinhronizē e-pastu public.users no auth (paziņojumiem uz pareizo adresi).
update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and au.email is not null
  and btrim(au.email) <> ''
  and (u.email is null or btrim(u.email) = '' or u.email is distinct from au.email);
