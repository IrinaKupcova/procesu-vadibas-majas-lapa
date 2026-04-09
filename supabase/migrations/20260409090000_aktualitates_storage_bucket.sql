-- Supabase Storage bucket aktualitāšu pielikumiem.
-- Faili glabājas bucketā "pdd-aktualitates-files", ceļš: <auth.uid()>/...

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdd-aktualitates-files',
  'pdd-aktualitates-files',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "aktualitates_files_read_all" ON storage.objects;
CREATE POLICY "aktualitates_files_read_all"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pdd-aktualitates-files');

DROP POLICY IF EXISTS "aktualitates_files_insert_own" ON storage.objects;
CREATE POLICY "aktualitates_files_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdd-aktualitates-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "aktualitates_files_update_own" ON storage.objects;
CREATE POLICY "aktualitates_files_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pdd-aktualitates-files'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'pdd-aktualitates-files'
  AND owner = auth.uid()
);

DROP POLICY IF EXISTS "aktualitates_files_delete_own" ON storage.objects;
CREATE POLICY "aktualitates_files_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdd-aktualitates-files'
  AND owner = auth.uid()
);
