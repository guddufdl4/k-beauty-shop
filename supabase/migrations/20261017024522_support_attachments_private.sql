-- Existing permissive storage policies must not expose customer attachments.
CREATE POLICY support_attachments_private ON storage.objects AS RESTRICTIVE
FOR ALL TO anon,authenticated
USING (bucket_id <> 'support-attachments')
WITH CHECK (bucket_id <> 'support-attachments');
