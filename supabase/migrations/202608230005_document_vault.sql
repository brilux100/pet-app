alter table public.documents
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists document_date date,
  add column if not exists clinic text,
  add column if not exists notes text,
  add column if not exists status text not null default 'confirmed',
  add column if not exists visit_id uuid references public.visits(id) on delete set null;

create index if not exists documents_pet_date_idx
  on public.documents(pet_id, document_date desc);

create index if not exists documents_visit_id_idx
  on public.documents(visit_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-documents',
  'pet-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pet_documents_select_own" on storage.objects;
create policy "pet_documents_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'pet-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "pet_documents_insert_own" on storage.objects;
create policy "pet_documents_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pet-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "pet_documents_update_own" on storage.objects;
create policy "pet_documents_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'pet-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'pet-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "pet_documents_delete_own" on storage.objects;
create policy "pet_documents_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'pet-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
