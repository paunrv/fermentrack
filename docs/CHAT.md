# Chat de equipo (Epic C)

Epic [#37](https://github.com/paunrv/fermentrack/issues/37) · Spec [WINEMAKER-UX-SPEC.md](./WINEMAKER-UX-SPEC.md)

Coordinación de bodega anclada al contexto operativo: canal general por organización + hilos por lote.

## Schema (C1 — #48)

Migración base: `supabase/migrations/20260703200000_team_chat.sql`  
Conversaciones (Fase 1): `supabase/migrations/20260708210000_team_chat_conversations.sql`

| Tabla | Rol |
|-------|-----|
| `wm_conversaciones` | Canal general por org (`kind = general`); DM/grupo en fases posteriores |
| `wm_conversacion_miembros` | Marca de lectura por usuario y conversación |
| `wm_mensajes` | Mensajes del canal / hilo (`conversation_id` + `lote_id` opcional) |
| `wm_mensajes_lectura` | *(legacy)* Marca org-level — sustituida por `wm_conversacion_miembros` |

### Columnas clave

- `wm_mensajes.lote_id` → `public.lots` (nullable)
- `wm_mensajes.author_id` → `profiles.id`
- `wm_mensajes.origen`: `web | mcp`
- Realtime: publicación `supabase_realtime` en `wm_mensajes`

### RLS v1

- `wm_mensajes`: `select` + `insert` (sin update/delete)
- `wm_mensajes_lectura`: `select` + `insert` + `update` (upsert last-read)
- Patrón org: `wm_row_select_allowed` / `wm_row_write_allowed`

## Gating por plan (Pro+)

Helper: `orgHasFeature(org, 'chat')` en `org-features.ts`

| Plan | Chat |
|------|------|
| Free | — |
| Pro / Enterprise | ✓ |
| Override | `organizations.features.chat` |

## UX

| Superficie | Issue | Comportamiento |
|------------|-------|----------------|
| Desktop shell | C2 (#49) | Panel lateral derecho colapsable (280px), toggle 💬 en rail + badge no leídos |
| Móvil | C3 (#50) | Tab 💬 en bottom nav → `/dashboard/winemaker/chat` |
| Detalle lote | C4 (#51) | Hilo filtrado por `lote_id` + menciones `LOT-YYYY-NNN` linkeadas |
| MCP | C5 (#52) | `list_mensajes` / `enviar_mensaje` |

### Fuera de scope v1

Sin DMs, reacciones, adjuntos, edición/borrado, threads anidados.

## Código

| Pieza | Path |
|-------|------|
| Types | `apps/web/src/lib/proof/team-chat-types.ts` |
| Conversaciones | `apps/web/src/lib/proof/team-chat-conversations.ts` |
| Loaders + realtime | `apps/web/src/lib/proof/team-chat.ts` |
| Insert + validación | `apps/web/src/lib/proof/record-team-message.ts` |
| Menciones LOT | `apps/web/src/lib/proof/team-chat-lot-mentions.ts` |
| Panel UI | `TeamChatPanel.tsx`, `TeamChatDock.tsx` |
| Hook | `useTeamChat.ts`, `useTeamChatUnread.ts` |
| Acción server | `apps/web/src/app/actions/team-chat.ts` |
| MCP formatter | `apps/web/src/lib/mcp/team-chat-mcp.ts` |

## Issues

| ID | Issue | Estado |
|----|-------|--------|
| C1 | [#48](https://github.com/paunrv/fermentrack/issues/48) | Migración + RLS ✅ |
| C2 | [#49](https://github.com/paunrv/fermentrack/issues/49) | Panel desktop + realtime + no leídos ✅ |
| C3 | [#50](https://github.com/paunrv/fermentrack/issues/50) | Tab móvil ✅ |
| C4 | [#51](https://github.com/paunrv/fermentrack/issues/51) | Menciones LOT + hilo en lote ✅ |
| C5 | [#52](https://github.com/paunrv/fermentrack/issues/52) | MCP + audit ✅ |

Doc MCP: [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md)
