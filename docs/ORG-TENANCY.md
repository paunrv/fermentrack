# PROOF · Organizaciones multi-tenant

Documento de referencia para el epic [#3](https://github.com/paunrv/fermentrack/issues/3).  
Define el modelo de tenancy, alcance v1, convenciones y roadmap.

---

## Modelo

```
auth.users
  └── profiles                    ← identidad (nombre, avatar)
  └── organization_members        ← user + role + status
        └── organizations         ← tenant (bodega / negocio)
              ├── org_type        ← v1: 'winemaker' únicamente
              ├── plan            ← free | pro | enterprise (Stripe)
              ├── plan_status     ← active | trialing | past_due | canceled
              └── datos wm_*      ← lotes, documentos, costos, eventos…
```

| Concepto | Tabla / campo |
|----------|----------------|
| Tenant | `organizations` |
| Membresía | `organization_members` (`owner`, `admin`, `member`, `viewer`) |
| Tipo de negocio | `organizations.org_type` |
| Aislamiento de datos | `*.organization_id` + RLS `organization_ids()` |

Migración base existente: `supabase/migrations/20260624130000_identity.sql`

---

## Alcance v1 (epic #3)

**En scope:** solo `org_type = 'winemaker'`.

| Área | Acción |
|------|--------|
| Tablas `wm_*` | Migrar a `organization_id` |
| Onboarding winemaker | Crear org (no `proof_profiles`) |
| RLS winemaker | `organization_ids()` |
| Stripe | `STRIPE_PRICE_WINEMAKER_PRO` por org |
| Catálogos org existentes | `varietals`, `vineyards`, `blocks`, `events`, `tasks` — alinear con org winemaker |

**Fuera de scope — congelado (no tocar en PRs del epic):**

| Módulo | Scope actual | Archivos clave |
|--------|--------------|----------------|
| **Distiller** | `clerk_id` + RLS `destilador_row_owned` | `destilador.ts`, `/dashboard/destilador/*`, `20250602000000_destilador_mezcal_core.sql` |
| **Distributor** | `user_id` + `profile_type_v2` | `distribuidor.ts`, inventario, pedidos, crédito, recepción |
| **Brewer** | Legacy `proof_profiles` + `batches` | onboarding brewer, `/dashboard/lotes` legacy |
| **Staff distributor** | `trabajadores` (patron/manager/bodega) | Converger con `organization_members` en epic distributor futuro |

---

## Roadmap

| Fase | `org_type` | Notas |
|------|------------|-------|
| **v1 (ahora)** | `winemaker` | Patrón de referencia |
| v2 | `distiller` | Reutilizar schema + RLS + onboarding; epic separado |
| v3 | `distributor` | Epic aparte; reemplazar `proof_profiles` + `trabajadores` |
| — | `brewer` | Evaluar deprecación o unificar con winemaker |

Al añadir un nuevo `org_type` en el futuro:

1. Extender `CHECK (org_type IN (...))` en migración aditiva
2. Copiar helpers RLS (sin cambiar la forma)
3. Duplicar patrón onboarding + `OrganizationContext`
4. Añadir `STRIPE_PRICE_*` correspondiente

---

## Flujos de onboarding

| Tipo elegido | Flujo | Persistencia |
|--------------|-------|--------------|
| **Winemaker** (v1 org) | Crear `organizations` + owner en `organization_members` | `organization_id` en `wm_*` |
| Distiller | Legacy — `upsertProfile` → `proof_profiles` | `clerk_id` en tablas destilador |
| Distributor | Legacy — `upsertProfile` | `user_id` + `profile_type_v2` |
| Brewer | Legacy — `upsertProfile` + `batches` | `user_id` + `profile_type_v2` |

Archivo: `apps/web/src/app/onboarding/page.tsx`

---

## Separación de rutas

Definida en `apps/web/src/lib/proof/dashboard-routes.ts`:

| Prefijo | Perfil |
|---------|--------|
| `/dashboard/winemaker/*` | Winemaker (org tenancy v1) |
| `/dashboard/destilador/*` | Distiller (roadmap org) |
| `/dashboard/inventario`, `pedidos`, `credito`, … | Distributor (roadmap org) |
| `/dashboard/lotes`, `bodega`, … | Brewer/winemaker legacy productor |

Guardas: `winemakerBlockedFromPath`, `distillerBlockedFromPath`, `distributorBlockedFromPath`.

---

## Reglas de migración (producción)

Ver también `PROOF_CONTEXT.md`.

1. **Aditivo primero** — `ADD COLUMN organization_id`; drop legacy solo en F6 (#12) tras validación
2. **Backfill + validar** — queries de huérfanos antes de `SET NOT NULL`
3. **Una fase por PR** — schema → backfill → RLS → app → cleanup
4. **`npm run build`** después de cada bloque
5. **OK explícito** antes de cutover RLS o drop columnas legacy

### Queries de validación (template)

```sql
-- Filas sin org tras backfill
select count(*) from wm_wine_lots where organization_id is null;

-- Usuario debe ser miembro de la org de sus filas
select w.organization_id
from wm_wine_lots w
where not (w.organization_id = any(public.organization_ids()));
```

---

## RLS — patrón estándar

Helpers (F1 — `20260630140000_org_winemaker_identity.sql`):

```sql
-- Membresía activa del usuario autenticado
public.organization_ids() → uuid[]

-- Rol en una org (owner | admin | member | viewer | null)
public.organization_role(p_org_id uuid) → text

-- Escritura operativa (owner, admin, member)
public.can_write_org(p_org_id uuid) → boolean

-- Gestión de equipo / billing (owner, admin)
public.can_manage_org(p_org_id uuid) → boolean
```

Políticas por tabla de negocio (F6 — `20260630190000_winemaker_drop_clerk_id.sql`):

```sql
using (public.wm_row_select_allowed(organization_id))
with check (public.wm_row_write_allowed(organization_id))
```

Storage `winemaker-documents`: carpeta `{organization_id}/...` únicamente (sin legacy `{userId}/`).

---

## App — convenciones

### Contexto

Archivo: `apps/web/src/context/OrganizationContext.tsx`

Persistencia: `localStorage` key `proof_active_organization`.

Hook compuesto: `apps/web/src/hooks/useWinemakerAccess.ts` (org + perfil legacy).

### Queries

```typescript
// ❌ No usar en código winemaker nuevo
.eq('clerk_id', scope.clerk_id)
.eq('user_id', scope.user_id).eq('profile_type_v2', 'winemaker')

// ✅ Scope por org
.eq('organization_id', activeOrg.id)
```

### Archivos winemaker (epic #3)

| Archivo | Rol |
|---------|-----|
| `apps/web/src/lib/supabase/winemaker.ts` | Queries `wm_*` |
| `apps/web/src/lib/supabase/winemaker-owner-home.ts` | Dashboard owner + catálogos org |
| `apps/web/src/lib/proof/winemaker-agent-actions.ts` | Agente |
| `apps/web/src/lib/proof/storage-winemaker-documents.ts` | Storage paths |
| `apps/web/src/context/OrganizationContext.tsx` | **Crear** en #6 |
| `apps/web/src/hooks/useWinemakerRouteGuard.ts` | Guard rutas winemaker (`useWinemakerAccess`) |

### Naming

| Capa | Convención |
|------|------------|
| SQL columna | `organization_id uuid not null references organizations(id)` |
| SQL tipo | `org_type text check (org_type in ('winemaker'))` — extensible |
| React | `activeOrg`, `OrganizationProvider` |
| Stripe metadata | `organization_id` |

---

## Stripe (winemaker v1)

| Campo org | Uso |
|-----------|-----|
| `stripe_customer_id` | 1 Customer Stripe por org |
| `stripe_subscription_id` | Suscripción activa |
| `plan` | `free` \| `pro` \| `enterprise` |
| `plan_status` | Sincronizado vía webhooks |

Env vars:

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_WINEMAKER_PRO
```

Endpoints: `POST /api/billing/checkout`, `/portal`, `/webhook`.

Solo **owner** ve billing UI y puede iniciar checkout. Owner y admin pueden abrir Customer Portal.

### Feature gating v1 (free vs pro)

| Límite | Free | Pro |
|--------|------|-----|
| Lotes | 3 | Ilimitado |
| Documentos / mes | 20 | Ilimitado |
| Invitar equipo | No | Sí |

Helpers: `apps/web/src/lib/billing/winemaker-plans.ts` (`WINEMAKER_PLAN_LIMITS`).  
Enforcement en app — roadmap post-#11; webhooks ya sincronizan `plan` / `plan_status`.

Env price distiller: `STRIPE_PRICE_DISTILLER_PRO` — epic futuro distiller.

---

## Deuda técnica registrada

| Item | Resolución |
|------|------------|
| `proof_profiles` + `profile_type_v2` para winemaker | Resuelto en #6 onboarding + #12 (sin upsert en invites) |
| `clerk_id` en `wm_*` | Resuelto en #12 — migración `20260630190000` |
| `trabajadores` vs `organization_members` | Epic distributor |
| Auth Clerk vs Supabase Auth | Distribuidor en transición; winemaker usa `auth.uid()` |

---

## Issues del epic

| Issue | Fase |
|-------|------|
| [#4](https://github.com/paunrv/fermentrack/issues/4) | Limpieza (este doc) |
| [#5](https://github.com/paunrv/fermentrack/issues/5) | Schema + helpers RLS |
| [#6](https://github.com/paunrv/fermentrack/issues/6) | OrganizationContext + onboarding |
| [#7](https://github.com/paunrv/fermentrack/issues/7) | Backfill `wm_*` |
| [#8](https://github.com/paunrv/fermentrack/issues/8) | RLS cutover |
| [#9](https://github.com/paunrv/fermentrack/issues/9) | App layer |
| [#10](https://github.com/paunrv/fermentrack/issues/10) | Equipo + switcher |
| [#11](https://github.com/paunrv/fermentrack/issues/11) | Stripe |
| [#12](https://github.com/paunrv/fermentrack/issues/12) | Cleanup legacy |

**Orden:** #4 → #5 → #6 → #7 → #8 → #9 → #10 → #11 → #12
