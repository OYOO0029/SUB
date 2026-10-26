-- Run in the SAME Supabase project as spending_state.
-- Private bucket, immutable objects, authenticated owner-only upload/read.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('work-images','work-images',false,2097152,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='work-images' and public) then
  raise exception 'work-images must be private. Review the existing bucket before continuing.';
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='work_images_owner_read') then
  create policy work_images_owner_read on storage.objects for select to authenticated
  using(bucket_id='work-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='work_images_owner_insert') then
  create policy work_images_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='work-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
 end if;
end $$;
commit;
-- No UPDATE/DELETE policies: old snapshots keep working. Asset garbage
-- collection must account for backups and Trash before any deletion.
