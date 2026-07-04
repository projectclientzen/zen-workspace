-- DATA-3b Storage bucket attachments, privat, path {user_id}/...
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_owner_select" on storage.objects
  for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_owner_insert" on storage.objects
  for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_owner_update" on storage.objects
  for update
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "attachments_owner_delete" on storage.objects
  for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
