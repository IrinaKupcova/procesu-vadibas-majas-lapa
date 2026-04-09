-- Aktualitātes: sinhronizācija ar Sodien.js / PDD dashboard.
-- Kolonnas atbilst Supabase UI: Kas_sodien_vel_aktuals, Sakums, Beigas.
-- Pievienots id (PK), jo HTML saturs nav piemērots kā vienīgais atslēgas lauks.

CREATE TABLE IF NOT EXISTS public."AKTUALITĀTES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  "Kas_sodien_vel_aktuals" text NOT NULL,
  "Sakums" date NOT NULL,
  "Beigas" date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ja tabula jau bija izveidota ar teksta PK (bez id), pārvietojam uz uuid PK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
      n.nspname = 'public'
      AND c.relname = 'AKTUALITĀTES'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
      n.nspname = 'public'
      AND c.relname = 'AKTUALITĀTES'
      AND a.attname = 'id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE public."AKTUALITĀTES"
    ADD COLUMN id uuid DEFAULT gen_random_uuid ();

    UPDATE public."AKTUALITĀTES"
    SET
      id = gen_random_uuid ()
    WHERE
      id IS NULL;

    ALTER TABLE public."AKTUALITĀTES"
    ALTER COLUMN id
    SET NOT NULL;

    ALTER TABLE public."AKTUALITĀTES"
    DROP CONSTRAINT IF EXISTS "AKTUALITĀTES_pkey";

    ALTER TABLE public."AKTUALITĀTES"
    ADD PRIMARY KEY (id);
  END IF;
END
$$;

ALTER TABLE public."AKTUALITĀTES"
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_aktualitates_sakums_beigas ON public."AKTUALITĀTES" ("Sakums", "Beigas");

CREATE INDEX IF NOT EXISTS idx_aktualitates_created ON public."AKTUALITĀTES" (created_at DESC);

ALTER TABLE public."AKTUALITĀTES" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aktualitates_select_all ON public."AKTUALITĀTES";

DROP POLICY IF EXISTS aktualitates_insert_all ON public."AKTUALITĀTES";

DROP POLICY IF EXISTS aktualitates_update_all ON public."AKTUALITĀTES";

DROP POLICY IF EXISTS aktualitates_delete_all ON public."AKTUALITĀTES";

-- Lasīt un mainīt drīkst jebkurš ar anon vai autentificētu atslēgu (ieskaitot anonīmu auth).
CREATE POLICY aktualitates_select_all ON public."AKTUALITĀTES" FOR SELECT
  USING (true);

CREATE POLICY aktualitates_insert_all ON public."AKTUALITĀTES" FOR INSERT
  WITH CHECK (true);

CREATE POLICY aktualitates_update_all ON public."AKTUALITĀTES" FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY aktualitates_delete_all ON public."AKTUALITĀTES" FOR DELETE
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public."AKTUALITĀTES" TO anon, authenticated, service_role;

-- Realtime (ja publikācija pastāv)
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
      AND tablename IN ('AKTUALITĀTES', 'aktualitates')
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public."AKTUALITĀTES";
  END IF;
END
$$;
