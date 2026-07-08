-- Owner-readable invite code (service_role only in app). Cleared when invite is accepted.

alter table public.organization_members
  add column if not exists access_code_plain text;

comment on column public.organization_members.access_code_plain is
  'Plain 4-digit invite code for owner display; null after acceptance. Never expose to invited user APIs.';
