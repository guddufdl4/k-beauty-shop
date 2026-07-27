-- Hero banner settings on site_settings singleton + public site-assets storage bucket

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_badge TEXT,
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS hero_button_text TEXT,
  ADD COLUMN IF NOT EXISTS hero_button_link TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "site_assets_storage_public_read" ON storage.objects;
CREATE POLICY "site_assets_storage_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_storage_admin_insert" ON storage.objects;
CREATE POLICY "site_assets_storage_admin_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "site_assets_storage_admin_update" ON storage.objects;
CREATE POLICY "site_assets_storage_admin_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "site_assets_storage_admin_delete" ON storage.objects;
CREATE POLICY "site_assets_storage_admin_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );