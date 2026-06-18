-- Dev/evaluación: borrar documentos desde canvas (JWT authenticated)
grant delete on public.wm_documents to authenticated, service_role;

drop policy if exists wm_documents_delete on public.wm_documents;
create policy wm_documents_delete on public.wm_documents
  for delete to authenticated
  using (proof.winemaker_row_owned(clerk_id));

drop policy if exists winemaker_documents_owner_delete on storage.objects;
create policy winemaker_documents_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'winemaker-documents'
    and proof.winemaker_row_owned((storage.foldername(name))[1])
  );
