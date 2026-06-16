alter table public.profiles
  add column if not exists titular_cuenta text;

comment on column public.profiles.titular_cuenta is 'Nombre del titular de la cuenta de depósito (como aparece en el banco)';

notify pgrst, 'reload schema';
