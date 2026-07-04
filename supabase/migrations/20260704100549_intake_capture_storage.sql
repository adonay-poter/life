INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intake-images',
  'intake-images',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Intake images insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "Intake images read own folder" ON storage.objects;
DROP POLICY IF EXISTS "Intake images update own folder" ON storage.objects;
DROP POLICY IF EXISTS "Intake images delete own folder" ON storage.objects;

CREATE POLICY "Intake images insert own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'intake-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Intake images read own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'intake-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Intake images update own folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'intake-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'intake-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Intake images delete own folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'intake-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
