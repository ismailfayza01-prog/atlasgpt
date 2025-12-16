-- Storage policies for bucket 'documents'
-- Run after creating the bucket.
-- For MVP simplicity, bucket can be Public. Policies still apply for writes.

-- Allow authenticated users to upload/overwrite within their own folder: {userId}/...
create policy if not exists "documents_write_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy if not exists "documents_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy if not exists "documents_read_public"
on storage.objects for select
to public
using (bucket_id = 'documents');
