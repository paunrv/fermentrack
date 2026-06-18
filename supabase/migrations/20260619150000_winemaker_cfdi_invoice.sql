-- PROOF · Winemaker — campos CFDI / factura (emisor, folio, totales, líneas detalladas)
-- Aditivo · idempotente

alter table public.wm_suppliers
  add column if not exists address text not null default '';

alter table public.wm_documents
  add column if not exists folio text not null default '',
  add column if not exists issuer_address text not null default '',
  add column if not exists payment_method text not null default '',
  add column if not exists payment_form text not null default '',
  add column if not exists concept_title text not null default '',
  add column if not exists subtotal numeric(14, 2) check (subtotal is null or subtotal >= 0),
  add column if not exists tax_iva numeric(14, 2) not null default 0 check (tax_iva >= 0),
  add column if not exists tax_iva_rate text not null default '',
  add column if not exists tax_iesps numeric(14, 2) not null default 0 check (tax_iesps >= 0),
  add column if not exists tax_isr_ret numeric(14, 2) not null default 0 check (tax_isr_ret >= 0),
  add column if not exists tax_iva_ret numeric(14, 2) not null default 0 check (tax_iva_ret >= 0),
  add column if not exists total_amount numeric(14, 2) check (total_amount is null or total_amount >= 0),
  add column if not exists currency text not null default 'MXN';

create index if not exists wm_documents_folio_idx
  on public.wm_documents (clerk_id, folio)
  where folio <> '';

alter table public.wm_document_lines
  add column if not exists product_service_code text not null default '',
  add column if not exists product_service_label text not null default '',
  add column if not exists unit_price numeric(14, 4) check (unit_price is null or unit_price >= 0),
  add column if not exists discount numeric(14, 2) not null default 0 check (discount >= 0),
  add column if not exists tax_note text not null default '';
