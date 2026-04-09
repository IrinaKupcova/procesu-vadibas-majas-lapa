-- AKTUALITATES: labot/dzēst drīkst autors VAI admin.

DROP POLICY IF EXISTS aktualitates_update_own ON public."AKTUALITATES";
DROP POLICY IF EXISTS aktualitates_delete_own ON public."AKTUALITATES";

CREATE POLICY aktualitates_update_owner_or_admin
ON public."AKTUALITATES"
FOR UPDATE
USING (
  "Autors" = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE
      u.id = auth.uid()
      AND lower(trim(coalesce(u.role, ''))) = 'admin'
  )
)
WITH CHECK (
  "Autors" = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE
      u.id = auth.uid()
      AND lower(trim(coalesce(u.role, ''))) = 'admin'
  )
);

CREATE POLICY aktualitates_delete_owner_or_admin
ON public."AKTUALITATES"
FOR DELETE
USING (
  "Autors" = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE
      u.id = auth.uid()
      AND lower(trim(coalesce(u.role, ''))) = 'admin'
  )
);
