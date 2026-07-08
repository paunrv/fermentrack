-- Phase 2a: DM conversations between org members
-- Spec: docs/CHAT.md — direct messages + member switcher

begin;

-- -----------------------------------------------------------------------------
-- Conversation access: general/lote (org) + dm/group (explicit membership)
-- -----------------------------------------------------------------------------
create or replace function public.wm_conversation_select_allowed(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wm_conversaciones c
    where c.id = p_conversation_id
      and public.wm_row_select_allowed(c.organization_id)
      and (
        c.kind in ('general', 'lote')
        or exists (
          select 1
          from public.wm_conversacion_miembros m
          where m.conversation_id = c.id
            and m.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.wm_conversation_write_allowed(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wm_conversaciones c
    where c.id = p_conversation_id
      and public.wm_row_write_allowed(c.organization_id)
      and (
        c.kind in ('general', 'lote')
        or exists (
          select 1
          from public.wm_conversacion_miembros m
          where m.conversation_id = c.id
            and m.user_id = auth.uid()
        )
      )
  );
$$;

-- Allow selecting DM/group rows the user belongs to
drop policy if exists wm_conversaciones_select on public.wm_conversaciones;
create policy wm_conversaciones_select on public.wm_conversaciones
  for select
  using (
    public.wm_row_select_allowed(organization_id)
    and (
      kind in ('general', 'lote')
      or exists (
        select 1
        from public.wm_conversacion_miembros m
        where m.conversation_id = wm_conversaciones.id
          and m.user_id = auth.uid()
      )
    )
  );

drop policy if exists wm_conversaciones_insert on public.wm_conversaciones;
create policy wm_conversaciones_insert on public.wm_conversaciones
  for insert
  with check (
    public.wm_row_write_allowed(organization_id)
    and (
      kind in ('general', 'lote')
      or (kind in ('dm', 'group') and created_by = auth.uid())
    )
  );

-- Members can insert themselves into a conversation they create (service via RPC)
drop policy if exists wm_conversacion_miembros_insert on public.wm_conversacion_miembros;
create policy wm_conversacion_miembros_insert on public.wm_conversacion_miembros
  for insert
  with check (
    user_id = auth.uid()
    and public.wm_conversation_select_allowed(conversation_id)
  );

-- -----------------------------------------------------------------------------
-- get_or_create_dm — idempotent DM between two active org members
-- -----------------------------------------------------------------------------
create or replace function public.get_or_create_wm_dm(
  p_organization_id uuid,
  p_other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_a uuid;
  v_b uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated';
  end if;

  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'invalid_dm_peer';
  end if;

  if not public.wm_row_write_allowed(p_organization_id) then
    raise exception 'no_permission';
  end if;

  -- Both must be active members of the org
  if not exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = v_me
      and om.status = 'active'
  ) then
    raise exception 'no_organization';
  end if;

  if not exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_other_user_id
      and om.status = 'active'
  ) then
    raise exception 'invalid_dm_peer';
  end if;

  -- Find existing DM with exactly these two members
  select c.id
  into v_id
  from public.wm_conversaciones c
  where c.organization_id = p_organization_id
    and c.kind = 'dm'
    and exists (
      select 1 from public.wm_conversacion_miembros m
      where m.conversation_id = c.id and m.user_id = v_me
    )
    and exists (
      select 1 from public.wm_conversacion_miembros m
      where m.conversation_id = c.id and m.user_id = p_other_user_id
    )
    and (
      select count(*)::int
      from public.wm_conversacion_miembros m
      where m.conversation_id = c.id
    ) = 2
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.wm_conversaciones (organization_id, kind, title, created_by)
  values (p_organization_id, 'dm', null, v_me)
  returning id into v_id;

  -- Ordered insert for determinism
  if v_me < p_other_user_id then
    v_a := v_me;
    v_b := p_other_user_id;
  else
    v_a := p_other_user_id;
    v_b := v_me;
  end if;

  insert into public.wm_conversacion_miembros (conversation_id, user_id)
  values
    (v_id, v_a),
    (v_id, v_b);

  return v_id;
end;
$$;

grant execute on function public.get_or_create_wm_dm(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
