-- RLS distributor: staff vía trabajadores + sin exigir profile_type_v2 del JWT
-- (usuarios multi-perfil con JWT distiller seguían sin ver SKUs distributor)

create or replace function proof.row_belongs_to_requester(
  p_clerk_id text,
  p_profile_type_v2 text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    proof.is_super_user()
    or (
      p_profile_type_v2 = 'distributor'
      and (
        p_clerk_id = proof.current_clerk_id()
        or proof.requester_es_trabajador_activo_scope(p_clerk_id, p_profile_type_v2)
      )
    );
$$;

notify pgrst, 'reload schema';
