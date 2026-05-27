# Clerk JWT → Supabase (RLS)

PROOF usa **Clerk** para login y **Supabase RLS** con `auth.jwt() ->> 'sub'` = `clerk_id`.

## 1. Plantilla JWT en Clerk

Dashboard Clerk → **JWT Templates** → **New template** → nombre: `supabase`

Cuerpo (claims):

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}",
  "profile_type_v2": "{{user.unsafe_metadata.profile_type_v2}}"
}
```

En Supabase Dashboard → **Authentication** → **JWT Settings**, si usas JWT de terceros, configura el **JWT Secret** de Clerk (o el flujo [Third-Party Auth con Clerk](https://supabase.com/docs/guides/auth/third-party/clerk)).

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
