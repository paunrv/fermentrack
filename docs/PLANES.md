# Planes y límites (Epic E)

Epic [#59](https://github.com/paunrv/fermentrack/issues/59) · Spec [WINEMAKER-UX-SPEC.md](./WINEMAKER-UX-SPEC.md)

Tres tiers comerciales + trial de vendimia. **Nunca se borran datos** — los límites solo bloquean creación.

## Schema (E1 — #60)

Migración: `supabase/migrations/20260703210000_plan_limites.sql`

### `plan_limites`

| plan | lotes_activos | etiquetas | memoria_meses | max_usuarios | chat | numeración |
|------|---------------|-----------|---------------|--------------|------|------------|
| regular | 5 | 5 | 12 | 1 | — | — |
| trial | 5 | 5 | 12 | 1 | — | — |
| pro | 20 | 30 | 36 | ∞ | ✓ | — |
| enterprise | ∞ | ∞ | ∞ | ∞ | ✓ | ✓ |

`null` = ilimitado. Features en columna `features jsonb`.

### `organizations` (campos nuevos)

| Columna | Uso |
|---------|-----|
| `plan` | `regular \| pro \| enterprise \| trial` (legacy `free` → `regular`) |
| `billing_cycle` | `monthly \| annual` |
| `trial_ends_at` | Fin trial 90 días |
| `primer_registro_at` | Ancla memoria |
| `renewal_anchor` | Pre-vendimia (fecha) |
| `features` | Overrides por org (Epic D6) |

## Helpers (E1)

| Helper | Path | Rol |
|--------|------|-----|
| `checkLimit(org, recurso)` | `plan-limits.ts` | Consulta límite sin lanzar |
| `assertPlanLimit(org, recurso)` | `plan-limits.ts` | Lanza `PlanLimitError` si bloqueado |
| `createActiveLot` | `record-active-lot.ts` | Creación de lotes con enforcement |
| `orgHasFeature(org, feature)` | `org-features.ts` | Gating chat / numeración |
| `fetchOrgPlanContext` | `plan-limits.ts` | Plan + límites + billing |

Recursos: `lotes_activos` · `etiquetas` · `usuarios` · `memoria`

### Memoria

Capacidad que se llena: span en meses desde el evento más antiguo. Al llegar al tope (`memoria_meses`), no se agregan eventos; el historial sigue visible.

## Enforcement web (E2 — #61)

| Recurso | Punto de bloqueo | Archivo |
|---------|------------------|---------|
| `lotes_activos` | Insert `public.lots` | `record-active-lot.ts` → `createActiveLot()` |
| `etiquetas` | Insert `wm_etiquetas` (solo etiqueta nueva) | `record-lot-bottling.ts` → `resolveEtiquetaId()` |
| `usuarios` | Insert/reactivación `organization_members` | `equipo.ts` → `inviteTeamMember()` |
| `memoria` | Insert `public.events` | `lot-etapa.ts`, `record-lot-bottling.ts` |

Códigos de error: `limit_reached_{recurso}`. UI: `dashboard.limits.*` + candado en invitar (`/dashboard/equipo`).

`usuarios` cuenta miembros `active` + `invited` (asientos ocupados).

## Enforcement MCP (E3 — #62)

Helper: `plan-limit-mcp.ts` — `McpPlanLimitError` con payload JSON (`message`, `upgrade_path`, `data_safe`).

`withMcpWriteScope` normaliza `PlanLimitError` y códigos `limit_reached_*`; audit `status = limit_blocked`.

| Tool | Recurso |
|------|---------|
| `crear_lote` | `lotes_activos` |
| `registrar_embotellado` | `etiquetas` (nueva) + `memoria` |
| `cambiar_etapa_lote` | `memoria` |

Upgrade path: `/dashboard/settings`. Ver [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md).

## Avisos home (E4 — #64)

Helper: `plan-limit-warnings.ts` · UI: `PlanLimitHomeAlerts.tsx`

| Recurso | Umbral approaching | UI |
|---------|-------------------|-----|
| `lotes_activos` | ≥80% o 1 slot restante | Barra + link a settings |
| `memoria` | ≥80% meses o lleno | Barra + link a settings |

Integrado en `WinemakerDesktopHome` y `WinemakerMobileHome` vía `useWinemakerOwnerHomeData`.

## Stripe (E5 — #63)

| Pieza | Path |
|-------|------|
| Trial 90 días sin tarjeta | `createWinemakerOrganization()` — `plan=trial`, `trial_ends_at` |
| Expiración trial | `resolveEffectivePlanTier()` + `isTrialExpired()` |
| Checkout mensual/anual | `POST /api/billing/checkout` + `billing-checkout.ts` |
| Ancla pre-vendimia | `billing-renewal-anchor.ts` — 1 agosto, prorrateo anual vía Stripe `billing_cycle_anchor` |
| Webhooks | `webhook-handlers.ts` — `billing_cycle`, `renewal_anchor` |

Env: `STRIPE_PRICE_WINEMAKER_PRO_MONTHLY`, `STRIPE_PRICE_WINEMAKER_PRO_ANNUAL` (legacy `STRIPE_PRICE_WINEMAKER_PRO` = monthly).

## Upgrade / downgrade (E6 — #65)

| Pieza | Path |
|-------|------|
| Candado invitar Pro | `plan-team-invites.ts` + `ProFeatureLock` en `/dashboard/equipo` |
| Enforcement invite | `inviteTeamMember()` → `invite_pro_required` |
| Resumen post-downgrade | `plan-over-limit.ts` — uso vs límites Regular |
| Settings | `fetchPlanBillingStatusAction` — trial expirado, aviso downgrade, portal Stripe |

Downgrade vía Stripe Customer Portal — **nunca borra datos**; `fetchPlanOverLimitSummary` informa recursos por encima del tier Regular.

## Cohorte fundadora (E7 — #66)

| Pieza | Path |
|-------|------|
| Columna `founding_member_at` | migración `20260703230000_founding_member.sql` |
| Cupón Stripe lifetime | env `STRIPE_COUPON_FOUNDING` — auto-aplicado en checkout anual |
| Helpers | `founding-cohort.ts` |
| Marcar org (super user) | `markOrganizationFoundingMemberAction()` + `scripts/mark-founding-member.sql` |
| Pricing público | `ProofLanding` + `landing.pricing` i18n (Regular / Pro / Enterprise, MXN) |

**Reglas:** primeras 30 bodegas Valle de Guadalupe; precio anual congelado de por vida vía cupón Stripe (ej. Regular $2,990 MXN/año). Trial 90 días sin tarjeta reemplaza el plan Basic $0.

## Issues

| ID | Issue | Estado |
|----|-------|--------|
| E1 | [#60](https://github.com/paunrv/fermentrack/issues/60) | Schema + helpers ✅ |
| E2 | [#61](https://github.com/paunrv/fermentrack/issues/61) | Enforcement web ✅ |
| E3 | [#62](https://github.com/paunrv/fermentrack/issues/62) | Enforcement MCP ✅ |
| E4 | [#64](https://github.com/paunrv/fermentrack/issues/64) | Avisos home ✅ |
| E5 | [#63](https://github.com/paunrv/fermentrack/issues/63) | Stripe ✅ |
| E6 | [#65](https://github.com/paunrv/fermentrack/issues/65) | Upgrade/downgrade ✅ |
| E7 | [#66](https://github.com/paunrv/fermentrack/issues/66) | Cohorte fundadora ✅ |

## Filosofía

> Nunca se borra nada, nunca se pierde acceso; solo se bloquea agregar más allá del límite.

Ver también: [INVENTARIO-TERMINADO.md](./INVENTARIO-TERMINADO.md) (gating numeración), [CHAT.md](./CHAT.md) (gating chat).
