-- Tabula AKTUALITATES (ASCII, kā Supabase kļūdā): Kas_sodien_vel_aktuals, Sakums, Beigas, Autors → users(id).
-- RLS: lasīt visi; ievietot/atjaunināt/dzēst tikai savus ierakstus (Autors = auth.uid()).

CREATE TABLE IF NOT EXISTS public."AKTUALITATES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  "Kas_sodien_vel_aktuals" text NOT NULL,
  "Sakums" date NOT NULL,
  "Beigas" date NOT NULL,
  "Autors" uuid,
  created_at timestamptz NOT NULL DEFAULT now ()
);

ALTER TABLE public."AKTUALITATES"
ADD COLUMN IF NOT EXISTS "Autors" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE
      conname = 'AKTUALITATES_Autors_fkey'
  ) THEN
    ALTER TABLE public."AKTUALITATES"
    ADD CONSTRAINT "AKTUALITATES_Autors_fkey" FOREIGN KEY ("Autors") REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public."AKTUALITATES"
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public."AKTUALITATES" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aktualitates_select_all ON public."AKTUALITATES";

DROP POLICY IF EXISTS aktualitates_insert_all ON public."AKTUALITATES";

DROP POLICY IF EXISTS aktualitates_update_all ON public."AKTUALITATES";

DROP POLICY IF EXISTS aktualitates_delete_all ON public."AKTUALITATES";

DROP POLICY IF EXISTS aktualitates_insert_own ON public."AKTUALITATES";

DROP POLICY IF EXISTS aktualitates_update_own ON public."AKTUALITATES";

DROP POLICY IF EXISTS aktualitates_delete_own ON public."AKTUALITATES";

CREATE POLICY aktualitates_select_all ON public."AKTUALITATES" FOR SELECT
  USING (true);

CREATE POLICY aktualitates_insert_own ON public."AKTUALITATES" FOR INSERT
  WITH CHECK (
    auth.uid () IS NOT NULL
    AND "Autors" = auth.uid ()
  );

CREATE POLICY aktualitates_update_own ON public."AKTUALITATES" FOR UPDATE
  USING ("Autors" = auth.uid ())
  WITH CHECK ("Autors" = auth.uid ());

CREATE POLICY aktualitates_delete_own ON public."AKTUALITATES" FOR DELETE
  USING ("Autors" = auth.uid ());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."AKTUALITATES" TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE
      pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE
      pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename IN ('AKTUALITATES', 'aktualitates')
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public."AKTUALITATES";
  END IF;
END
$$;
