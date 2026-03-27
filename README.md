# PDD aplikācija

Pakalpojumu dizaina daļas darba organizācija: **React (Vite)**, **Supabase** (auth + dati), izvietošana **GitHub Pages**.

## Repozitorijs

- **GitHub:** [IrinaKupcova/PDD_aplikacija](https://github.com/IrinaKupcova/PDD_aplikacija) · [iestatījumi](https://github.com/IrinaKupcova/PDD_aplikacija/settings)
- **Klonēt (SSH):** `git clone git@github.com:IrinaKupcova/PDD_aplikacija.git`
- **Klonēt (HTTPS):** `git clone https://github.com/IrinaKupcova/PDD_aplikacija.git`

Lokāli `origin` bieži ir: `git@github.com:IrinaKupcova/PDD_aplikacija.git` — tad `git push -u origin main`.

### Pēc klona — GitHub + Supabase

1. **GitHub → Settings → Secrets → Actions:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. **GitHub → Settings → Pages:** avots **GitHub Actions**.
3. **Supabase:** SQL no `supabase/migrations/…` un **Auth URL** kā zemāk.

Pēc `git push` uz `main` darbplūsma **Deploy GitHub Pages** saliek lapu.

## Supabase

1. Izveido projektu [supabase.com](https://supabase.com) → **Project URL** un **anon public** atslēga (**Settings → API**).
2. **SQL Editor** → ielīmē un palaid `supabase/migrations/20260327220000_initial_pdd.sql`.
3. **Authentication → URL configuration** (svarīgi GitHub Pages):
   - **Site URL**: `https://irinakupcova.github.io/PDD_aplikacija/` (GitHub lietotājvārds **arakstā**, beigās `/` parasti OK.)
   - **Redirect URLs**: tā pati adrese un `http://localhost:5173/**` izstrādei.
4. Pēc pirmā testa lietotāja — SQL (aizstāj UUID):  
   `update public.profiles set role = 'manager' where id = '…';`

## GitHub

1. Repozitorijs `PDD_aplikacija` (vai cits nosaukums — tad pielāgo URL Supabase laukos).
2. **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Settings → Pages** → **Build and deployment** → avots: **GitHub Actions** (nevis „Deploy from branch”).
4. Push uz `main` — pēc minūtes publiskā adrese (ja ieslēgts GitHub Pages no Actions):  
   `https://irinakupcova.github.io/PDD_aplikacija/`

## Lokāli

```bash
cp .env.example .env
# aizpildi VITE_SUPABASE_URL un VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`npm run build` izveido mapi `dist/` — to pašu saturu izmanto arī GitHub Actions.

## Supabase + GitHub Pages ikonas

- Aplikācija pārlūkā runā ar Supabase API; servera koda nav.
- **Anon** atslēga paredzēta klientam; tomēr ieteicams **Row Level Security** (jau migrācijā) un nepublicēt **service_role** atslēgu.
