-- Public contact form submissions from the PROOF marketing site.

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  producer_type text,
  created_at timestamptz not null default now()
);

create index contact_submissions_created_at_idx on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;

-- Anonymous visitors can submit the contact form; reads are not exposed to clients.
create policy contact_submissions_insert_public on public.contact_submissions
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.contact_submissions to anon, authenticated;
