# Clerk JWT → Supabase (RLS)

PROOF usa **Clerk** para login y **Supabase RLS** con `auth.jwt() ->> 'sub'` = `clerk_id`.

## 1. Plantilla JWT en Clerk

Dashboard Clerk → **JWT Templates** → **New template** → nombre exacto: `supabase`

Si `getToken({ template: 'supabase' })` devuelve `null`, la plantilla no existe o el nombre no coincide.

### Claims (payload)

```json
{
  "role": "authenticated",
  "aud": "authenticated",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "clerk_id": "{{user.id}}",
  "profile_type_v2": "{{user.unsafe_metadata.profile_type_v2}}"
}
```

`profile_type_v2` es opcional pero recomendado para RLS de distribuidor.

### Signing key (obligatorio)

En la plantilla, activa **custom signing key** y pega el **JWT Secret** de Supabase:

**Supabase** → Project Settings → **API** → **JWT Secret** (no la anon key).

No uses el signing key por defecto de Clerk: Supabase debe validar el mismo secret.

Si el insert devuelve **401** en Network pero el JWT existe, el secret no coincide con el que valida Supabase (o el proyecto ya usa JWT asímetricos y hay que activar Clerk en Third-Party Auth).

Si devuelve **42501** con hint `GRANT ... TO anon`, la petición va sin Bearer válido (template ausente o `getToken` null) — el cliente usa la anon key.

Alternativa: [Third-Party Auth con Clerk](https://supabase.com/docs/guides/auth/third-party/clerk) en Supabase Dashboard → Authentication (sin custom signing key en la plantilla).

## 2. Metadata de perfil activo

Al cambiar de perfil, la app actualiza `unsafeMetadata.profile_type_v2` (ver `ProfileContext`).  
Para distribuidor debe ser `"distributor"`.

## 3. Cliente en el browser

```typescript
import { useSupabase } from '@/hooks/useSupabase'

const supabase = useSupabase() // inyecta Bearer del template `supabase`
```

## 4. Solo servidor (service role)

Variable de entorno:

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Usar **únicamente** en:

- `apps/web/src/utils/supabase/service.ts`
- Server Actions como `createPedidoDraftAction` (número de pedido)

**Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` como `NEXT_PUBLIC_*`.

## 5. RPCs públicas

Tras migración `20250526200200_proof_public_rpc_wrappers.sql`:

- `confirmar_pedido`
- `cancelar_pedido`
- `entregar_pedido`
- `confirmar_recepcion`
- `sync_all_skus_for_scope`
- `proof_next_codigo`

Llamar desde el cliente autenticado con `supabase.rpc(...)`.
