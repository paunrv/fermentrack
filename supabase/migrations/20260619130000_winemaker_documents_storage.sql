-- PROOF · Winemaker — bucket privado para tickets y documentos
-- Patrón: carpeta = clerk_id (como recepciones)

insert into storage.buckets (id, name, public)
values ('winemaker-documents', 'winemaker-documents', false)
on conflict (id) do nothing;

drop policy if exists winemaker_documents_owner_select on storage.objects;
create policy winemaker_documents_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'winemaker-documents'
    and proof.winemaker_row_owned((storage.foldername(name))[1])
  );

drop policy if exists winemaker_documents_owner_insert on storage.objects;
create policy winemaker_documents_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'winemaker-documents'
    and proof.winemaker_row_owned((storage.foldername(name))[1])
  );
