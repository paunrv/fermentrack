# Winemaker UI/UX — Desktop home, rail, chat de equipo, inventario terminado y planes

Spec para epics e issues en GitHub. Repo: [paunrv/fermentrack](https://github.com/paunrv/fermentrack).

Contexto: el backlog quedó limpio tras BYOA ([#24](https://github.com/paunrv/fermentrack/issues/24)). Este documento define el siguiente bloque de trabajo: UI/UX consciente de desktop y móvil para el perfil winemaker, un módulo nuevo de producto terminado que extiende el dominio, y el modelo de planes/límites que monetiza todo lo anterior.

**Orden recomendado de implementación:** **A → E1 → D → C → B → resto de E** (el pipeline redefine el home; el gating por plan de D depende del helper de límites de E1; inventario terminado depende de la etapa Embotellado; chat toca schema + realtime + móvil; el rail es independiente y puede ir en paralelo; la facturación completa de E puede cerrar el bloque).

---

## Epic A — Desktop home winemaker: pipeline de bodega

Epic [#35](https://github.com/paunrv/fermentrack/issues/35)

### Problema

`WinemakerMobileHome` se renderiza en `/dashboard` a todo ancho en desktop (≥1024): acordeones colapsados, sin contenedor máximo, ~80% de pantalla vacía, badges numéricos a 1800px de su label. El home no responde la pregunta central del enólogo: *¿dónde está cada lote y qué necesita hoy?*

### Solución

Nuevo componente `WinemakerDesktopHome` para ≥1024. `WinemakerMobileHome` queda intacto en ≤767; `/dashboard` elige componente según los breakpoints de [DASHBOARD-BREAKPOINTS.md](./DASHBOARD-BREAKPOINTS.md). No usar media queries dentro del componente móvil.

### Layout (desktop ≥1024)

- Contenedor `max-width: 1280px` centrado.
- **Header**: saludo + fecha, pill de **salud** ("Todo en orden" verde / "N lotes requieren atención" warning/danger), pill de estado del agente MCP.
- **Pipeline de bodega** (protagonista): 6 columnas fijas `Cosecha → Análisis → Fermentación → Maloláctica → Crianza → Embotellado`.
  - Cada lote se renderiza como tarjeta en su etapa (código, varietal, contenedor, última medición, tiempo desde último registro).
  - Etapas vacías visibles pero silenciosas (guion, contador 0).
  - Subrayado de color en la etapa: neutro sin lotes, accent con lotes en curso, danger si algún lote de la etapa requiere atención.
  - Alertas viven **en la tarjeta del lote** (no en sección "Atención ahora" aparte).
  - Sin drag-and-drop: el cambio de etapa es un evento con fecha y datos, se registra desde el detalle del lote o vía agente. Click en tarjeta → detalle del lote.
  - Escala: con >6 lotes por columna, scroll interno de columna; con >15 lotes totales, colapsar tarjetas a chips con contador (definir umbral en QA).
- **Fila inferior** (3 tarjetas iguales): Tareas pendientes · Calendario · Agente externo (estado, expiración de token, última tool llamada desde `mcp_tool_calls`).
- La tarjeta "Conectar agente" solo es prominente cuando **no** hay conexión; conectado, se degrada a pill en header + tarjeta de estado.

### Modelo de datos

- `wm_lotes.etapa` — enum `cosecha | analisis | fermentacion | malolactica | crianza | embotellado`.
  - Decidir: campo explícito vs. derivado del último evento. Recomendado: **campo explícito** actualizado por evento de cambio de etapa (trazable, indexable, simple para RLS y tools).
  - Migración con backfill desde eventos existentes si aplica.
- La etapa `embotellado` es terminal y dispara la creación de existencias (ver Epic D).

### MCP

- `list_lotes` extiende su respuesta con `etapa` y `dias_sin_registro`.
- `get_resumen_bodega` incluye conteo por etapa y el indicador de salud.

### Issues

| ID | Issue | Entregable |
|----|-------|------------|
| A1 | [#39](https://github.com/paunrv/fermentrack/issues/39) | Migración `wm_lotes.etapa` + backfill + evento de cambio de etapa |
| A2 | [#40](https://github.com/paunrv/fermentrack/issues/40) | `WinemakerDesktopHome`: header (salud, fecha, agente) + grid contenedor |
| A3 | [#41](https://github.com/paunrv/fermentrack/issues/41) | Componente `PipelineBodega` (6 columnas, tarjetas de lote, estados vacío/alerta/escala) |
| A4 | [#42](https://github.com/paunrv/fermentrack/issues/42) | Fila inferior: tareas, calendario, tarjeta de agente con datos de `mcp_tool_calls` |
| A5 | [#43](https://github.com/paunrv/fermentrack/issues/43) | Switch por breakpoint en `/dashboard` + actualizar [DASHBOARD-SHELL.md](./DASHBOARD-SHELL.md) y checklist [DESKTOP-QA.md](./DESKTOP-QA.md) |
| A6 | [#44](https://github.com/paunrv/fermentrack/issues/44) | Extender tools `list_lotes` / `get_resumen_bodega` con etapa y salud |

### Criterios de aceptación

- En ≥1024 no se renderiza ningún acordeón; todo el contenido visible sin clicks.
- En ≤767 el home es idéntico al actual (cero regresión móvil).
- Un lote con >5 días sin registro se distingue en el pipeline sin abrir nada.
- El agente responde "resume el estado de mi bodega" con conteo por etapa.

---

## Epic B — Rail de navegación

Epic [#36](https://github.com/paunrv/fermentrack/issues/36)

### Problema

El rail de 52px acumula ~20 iconos sin agrupar, sin labels, con grupos aparentemente duplicados. Imposible de escanear.

### Solución

- Auditar rutas reales por perfil y eliminar duplicados.
- Agrupar con separadores: **Operación** (home, lotes, documentos) · **Equipo** (chat, miembros, calendario) · **Configuración** (settings, conectar agente).
- Tooltip con label al hover (desktop) y, opcional, modo expandido persistible (rail 52px ↔ 220px) — decidir en diseño si entra en v1.
- Indicador de sección activa consistente con tokens de `@fermentrack/ui`.

### Issues

| ID | Issue | Entregable |
|----|-------|------------|
| B1 | [#45](https://github.com/paunrv/fermentrack/issues/45) | Auditoría de items del rail por perfil (matriz ruta × perfil, detectar duplicados) |
| B2 | [#46](https://github.com/paunrv/fermentrack/issues/46) | Agrupación + separadores + tooltips |
| B3 | [#47](https://github.com/paunrv/fermentrack/issues/47) | *(opcional)* Modo expandido con preferencia persistida |

### Criterios de aceptación

- Ningún icono duplicado; máximo 3 grupos con separador visible.
- Todo icono tiene tooltip con label localizado (es-MX / en-US vía next-intl).

---

## Epic C — Chat interno de equipo

Epic [#37](https://github.com/paunrv/fermentrack/issues/37)

### Problema

La coordinación de bodega ocurre fuera de PROOF (WhatsApp), sin vínculo con lotes ni trazabilidad.

### Solución

Chat **anclado al contexto operativo**, no un Slack genérico:

- Un **canal general** por organización.
- **Hilos por lote**: mensaje asociado a `lote_id` aparece en el canal y en el detalle del lote.
- Menciones `LOT-YYYY-NNN` se detectan y linkean a la tarjeta del pipeline.
- Realtime vía Supabase Realtime (suscripción por `organization_id`).
- Contador de no leídos (last-read por miembro).

### Scope v1 — explícitamente fuera

Sin DMs, sin reacciones, sin adjuntos (los documentos tienen su flujo propio), sin edición ni borrado de mensajes, sin threads anidados.

### Modelo de datos

```sql
wm_mensajes (
  id uuid pk,
  organization_id uuid not null,     -- RLS por org, patrón epic #3
  lote_id uuid null,                 -- null = canal general
  author_id uuid not null,
  body text not null,
  created_at timestamptz default now()
)
wm_mensajes_lectura (
  organization_id uuid,
  member_id uuid,
  last_read_at timestamptz,
  pk (organization_id, member_id)
)
```

RLS: `organization_members` del org pueden `select/insert`; sin `update/delete` en v1.

### UX

- **Desktop**: panel lateral colapsable en el shell (a la derecha del canvas), persistente entre rutas; badge de no leídos en el rail.
- **Móvil**: tab de primer nivel en `WinemakerMobileHome` (es el caso de uso más móvil: el equipo está en la bodega con el teléfono).
- Composer de una línea; mensajes con avatar/iniciales, hora, chip de lote cuando aplica.

### MCP

- `list_mensajes` (read) — filtros: `lote_id`, `desde`, `limit`. Permite al agente responder "¿qué comentó María sobre el lote 002?".
- `enviar_mensaje` (write) — publica como el owner vía agente; marcar origen `mcp` en el mensaje y registrar en `mcp_tool_calls`.

### Issues

| ID | Issue | Entregable |
|----|-------|------------|
| C1 | [#48](https://github.com/paunrv/fermentrack/issues/48) | Migración `wm_mensajes` + `wm_mensajes_lectura` + RLS |
| C2 | [#49](https://github.com/paunrv/fermentrack/issues/49) | Panel de chat desktop (shell) + suscripción realtime + no leídos |
| C3 | [#50](https://github.com/paunrv/fermentrack/issues/50) | Tab de chat en móvil |
| C4 | [#51](https://github.com/paunrv/fermentrack/issues/51) | Detección y link de menciones `LOT-*` + hilo en detalle de lote |
| C5 | [#52](https://github.com/paunrv/fermentrack/issues/52) | Tools MCP `list_mensajes` / `enviar_mensaje` + audit + docs en [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md) |

### Criterios de aceptación

- Mensaje enviado desde móvil aparece en desktop sin refresh (<2 s).
- Mensaje con `lote_id` visible en detalle del lote y en el canal.
- El agente lista los mensajes de un lote y puede publicar uno; ambos quedan en audit log.

---

## Epic D — Inventario de producto terminado (etiquetas)

Epic [#38](https://github.com/paunrv/fermentrack/issues/38)

### Problema

El pipeline termina en Embotellado y ahí el modelo se acaba. No existe la entidad de producto terminado: etiqueta, añada, formato, cajas, stock, salidas. La consulta "muéstrame las etiquetas que tengo disponibles en bodega" no tiene respuesta estructurada.

### Conceptos

- **Etiqueta**: el producto ("Nebbiolo Reserva"). Catálogo por organización.
- **Existencia**: etiqueta + añada + formato, con lote de origen. Nace en el evento de embotellado.
- **Añada**: explícita en el embotellado (no solo derivada del lote — existen ensambles multi-añada).
- **Unidad canónica = botella; la caja es empaque** (`botellas_por_caja`: 12, 9 o 6, definido al embotellar). Todo se almacena en botellas; UI y agente muestran ambas unidades.
- **Salidas = ledger**: el stock disponible es dato **derivado** (producidas − suma de salidas). Nunca se edita a mano; discrepancias físicas se registran como ajuste (un movimiento más).
- **Siempre visibles** en cualquier vista de existencia: `producidas` (cuántas salieron del embotellado), `consumidas` (número de consumo acumulado) y `disponibles`. Nunca solo el disponible.

### Modelo de datos

```sql
wm_etiquetas (
  id uuid pk,
  organization_id uuid not null,
  nombre text not null,
  varietal text, region text, tipo text,
  created_at timestamptz
)
wm_existencias (
  id uuid pk,
  organization_id uuid not null,
  etiqueta_id uuid not null references wm_etiquetas,
  lote_id uuid not null references wm_lotes,   -- origen
  anada int not null,
  formato text not null,                        -- '750ml' | 'magnum' | ...
  botellas_por_caja int not null,               -- 12 | 9 | 6
  botellas_producidas int not null,             -- fijo al embotellar
  created_at timestamptz
)
wm_salidas (
  id uuid pk,
  organization_id uuid not null,
  existencia_id uuid not null references wm_existencias,
  tipo text not null,          -- venta | degustacion | autoconsumo | merma | ajuste
  botellas int not null,       -- siempre en unidad canónica
  rango_inicio int null,       -- numeración física — Enterprise (columnas desde v1)
  rango_fin int null,
  registrado_por uuid not null,
  origen text default 'web',   -- web | mcp
  created_at timestamptz
)
```

RLS por `organization_id`, patrón epic #3. Constraint: suma de salidas ≤ producidas por existencia.

### Numeración física de botellas — Enterprise

- Columnas `rango_inicio/rango_fin` existen desde la primera migración (evitar migración futura).
- Feature gateada por plan de la organización (Epic E — helper `orgHasFeature`, ver [#58](https://github.com/paunrv/fermentrack/issues/58)):
  - Enterprise: el formulario de salida muestra la sección de rango, **pre-llenando el siguiente** (consumidas + 1) y validando no-traslape con rangos ya registrados.
  - No-Enterprise: la sección se **oculta por completo** en el flujo de captura (sin upsell en formularios operativos; el diferencial de plan vive en settings/billing).

### UX

- **Vista "Etiquetas en bodega"** (nueva ruta, desktop y móvil):
  - Agrupación primaria por **etiqueta**; dentro, filas por **añada + formato** con lote de origen.
  - Filtros tipo chip: añada, formato.
  - Cada fila muestra: `botella N° {consumidas} de {producidas} · quedan {disponibles}` + barra de progreso de consumo. Disponible en doble unidad: "96 botellas · 8 cajas de 12"; cajas rotas como "5 cajas + 9 sueltas".
  - Estado "stock bajo" (umbral configurable por etiqueta) en warning.
- **Formulario "Registrar salida"**: tipo de salida, cantidad con toggle **cajas/botellas** y línea de conversión siempre visible ("2 cajas de 12 = 24 botellas · quedarán 72"), sección de rango solo Enterprise.
- **Conexión con pipeline (Epic A)**: el evento de embotellado crea la existencia — formulario de cierre de lote pide etiqueta (o crearla), añada, formato, botellas por caja, total producido.

### MCP

Regla del catálogo: *la tool devuelve la jerarquía con la que el humano piensa el inventario*.

- `list_etiquetas` (read) — respuesta agrupada:

```json
{
  "etiquetas": [{
    "nombre": "Nebbiolo Reserva",
    "existencias": [{
      "anada": 2023, "formato": "750ml", "lote_origen": "LOT-2023-004",
      "botellas_por_caja": 12,
      "producidas": 480, "consumidas": 384, "disponibles": 96,
      "cajas_disponibles": 8, "sueltas": 0
    }],
    "total_disponibles": 181
  }]
}
```

Filtros: `anada`, `formato`, `etiqueta_id`.

- `registrar_salida` (write) — params: `existencia_id`, `tipo`, `cantidad`, `unidad: cajas|botellas`, `rango_inicio/fin` (solo Enterprise). Responde siempre con la conversión hecha para confirmación del agente antes de ejecutar. Audit en `mcp_tool_calls`, `origen = 'mcp'` en la salida.

### Issues

| ID | Issue | Entregable |
|----|-------|------------|
| D1 | [#53](https://github.com/paunrv/fermentrack/issues/53) | Migraciones `wm_etiquetas`, `wm_existencias`, `wm_salidas` + RLS + constraints |
| D2 | [#54](https://github.com/paunrv/fermentrack/issues/54) | Evento de embotellado crea existencia (formulario de cierre de lote, integra con Epic A) |
| D3 | [#55](https://github.com/paunrv/fermentrack/issues/55) | Vista "Etiquetas en bodega" con agrupación, filtros y contadores siempre visibles |
| D4 | [#56](https://github.com/paunrv/fermentrack/issues/56) | Formulario "Registrar salida" (toggle cajas/botellas, conversión, gating Enterprise) |
| D5 | [#57](https://github.com/paunrv/fermentrack/issues/57) | Tools MCP `list_etiquetas` / `registrar_salida` + docs |
| D6 | [#58](https://github.com/paunrv/fermentrack/issues/58) | Gating por plan (helper `orgHasFeature('numeracion_botellas')` — depende de E1 [#60](https://github.com/paunrv/fermentrack/issues/60)) |

### Criterios de aceptación

- "Muéstrame las etiquetas disponibles en bodega" vía agente devuelve la agrupación etiqueta → añada/formato con producidas/consumidas/disponibles.
- Registrar una salida de 2 cajas descuenta 24 botellas y el contador de consumo avanza.
- El disponible nunca es editable; un ajuste manual queda como movimiento en el ledger.
- Org no-Enterprise no ve campos de rango; org Enterprise no puede registrar rangos traslapados.

### Nota de convergencia (no implementar ahora)

`etiqueta + añada + formato` ≈ **SKU** del perfil distribuidor. Diseñar `wm_existencias` con los mismos campos de formato/unidad que usa el lado distribuidor para que, a futuro, el embotellado de una bodega pueda generar el SKU que un distribuidor vende dentro de PROOF.

---

## Epic E — Planes, límites y ciclo de facturación

Epic [#59](https://github.com/paunrv/fermentrack/issues/59)

### Problema

No hay un modelo unificado de límites para lotes activos, catálogo de etiquetas, capacidad de memoria, usuarios ni feature flags. El plan Basic $0 no encaja con el go-to-market en Valle de Guadalupe. Features premium (numeración de botellas en Epic D, chat en Epic C) requieren gating por plan.

### Solución

Tres tiers (Regular / Pro / Enterprise) con enforcement que **nunca borra datos ni revoca acceso al historial** — solo bloquea agregar más allá del límite. Memoria como capacidad que se llena, no ventana deslizante. Ciclo de facturación alineado a pre-vendimia; trial de 90 días sin tarjeta.

### Filosofía — regla única

**Nunca se borra nada, nunca se pierde acceso; solo se bloquea agregar más allá del límite.** Aplica a lotes, etiquetas, usuarios y memoria por igual.

### Planes (MXN)

| | Regular | Pro | Enterprise |
|---|---|---|---|
| Mensual | $399 | $899 | Custom |
| Anual | $3,588 ($299/mes efectivo) | $7,990 ($666/mes efectivo) | Custom |
| Lotes activos | 5 | 20 | Ilimitado |
| Etiquetas (catálogo) | 5 | 30 | Ilimitado |
| Memoria | 12 meses | 3 años | Ilimitada |
| Usuarios | 1 (owner) | Owner + winemaker + workers | Ilimitado |
| Chat (Epic C) | — | ✓ | ✓ |
| Numeración botellas (Epic D) | — | — | ✓ |

El plan Basic $0 permanente **se elimina** — lo reemplaza el trial de vendimia (90 días, límites Regular, sin tarjeta).

### Modelo de datos

```sql
plan_limites (
  plan text pk,                -- regular | pro | enterprise | trial
  lotes_activos int null,      -- null = ilimitado
  etiquetas int null,
  memoria_meses int null,
  max_usuarios int null,
  features jsonb               -- { voice_agent, smart_photo, chat, numeracion_botellas, ... }
)
-- organizations: plan, billing_cycle, trial_ends_at, primer_registro_at, renewal_anchor
```

Helpers: `checkLimit(org, recurso)` (enforcement en creación) y `orgHasFeature(org, feature)` (gating de features — lo consume D6 [#58](https://github.com/paunrv/fermentrack/issues/58)).

### Issues

| ID | Issue | Entregable |
|----|-------|------------|
| E1 | [#60](https://github.com/paunrv/fermentrack/issues/60) | Tabla `plan_limites` + campos en `organizations` + helpers `checkLimit` / `orgHasFeature` |
| E2 | [#61](https://github.com/paunrv/fermentrack/issues/61) | Enforcement en web: creación de lotes, etiquetas, invitaciones y registros (memoria) |
| E3 | [#62](https://github.com/paunrv/fermentrack/issues/62) | Enforcement en write tools MCP con mensajes de motivo + upgrade path; audit |
| E4 | [#64](https://github.com/paunrv/fermentrack/issues/64) | Avisos predictivos en home (memoria, lotes activos) — integra con Epic A |
| E5 | [#63](https://github.com/paunrv/fermentrack/issues/63) | Stripe: prices mensual/anual, prorrateo del primer ciclo al anchor pre-vendimia, trial 90 días |
| E6 | [#65](https://github.com/paunrv/fermentrack/issues/65) | Flujos de upgrade/downgrade + candado "Invitar" (Disponible en Pro) |
| E7 | [#66](https://github.com/paunrv/fermentrack/issues/66) | Cohorte fundadora (price fijo/coupon de por vida) + página de pricing actualizada |

### Criterios de aceptación

- Regular con 5 lotes activos no puede crear el 6; al embotellar uno, sí puede.
- Memoria llena → no se agregan eventos; el historial completo sigue visible y exportable.
- Suscripción anual iniciada fuera de temporada se prorratea y renueva en pre-vendimia.
- Trial expirado: cero pérdida de datos; el agente MCP explica el límite y ofrece upgrade.
- Downgrade no borra ni oculta nada; solo bloquea creación hasta cumplir límites.

---

## Transversal

- **i18n**: todo string nuevo en `apps/web/messages/es-MX.json` y `en-US.json` (patrón epic [#13](https://github.com/paunrv/fermentrack/issues/13)).
- **UI**: componentes nuevos sobre primitivos de `@fermentrack/ui`; los reutilizables (`PipelineBodega`, barra de consumo, chips de filtro) se documentan en `apps/storybook`.
- **Docs a crear/actualizar**:
  - [WINEMAKER-HOME.md](./WINEMAKER-HOME.md) *(Epic A — owner pipeline)*
  - [CHAT.md](./CHAT.md) *(nuevo — Epic C)*
  - [INVENTARIO-TERMINADO.md](./INVENTARIO-TERMINADO.md) *(Epic D — schema D1)*
  - [PLANES.md](./PLANES.md) *(nuevo — Epic E)*
  - [PROOF-BYOA-MCP.md](./PROOF-BYOA-MCP.md) *(tools nuevas)*
  - [DESKTOP-QA.md](./DESKTOP-QA.md) *(checklist ampliado)*
- **Archivos de referencia**:
  - `apps/web/src/lib/mcp/register-tools.ts`
  - `apps/web/src/lib/proof/connection-hub-tools.ts`
  - `apps/web/src/components/proof/WinemakerMobileHome.tsx`

## Dependencias entre epics

```
A (#35) ──A1 (#39)──► D2 (#54)
A (#35) ──A3 (#41)──► C4 (#51)
A (#35) ──A2 (#40)──► E4 (#64)
E (#59) ──E1 (#60)──► D6 (#58) ──► D4 (#56)
B (#36) — independiente (paralelo)
```

- D2 depende de A1 (etapa embotellado como evento).
- D6 depende de E1 (helper `orgHasFeature`).
- D4 depende de D6 (gating Enterprise en formulario de salida).
- C4 depende de A3 (tarjetas de lote linkeables).
- E4 depende de A2 (home desktop donde viven los avisos).
- B es independiente.
- Las tools MCP nuevas (A6 [#44](https://github.com/paunrv/fermentrack/issues/44), C5 [#52](https://github.com/paunrv/fermentrack/issues/52), D5 [#57](https://github.com/paunrv/fermentrack/issues/57)) siguen el patrón de fases 1–2 de BYOA ([#26](https://github.com/paunrv/fermentrack/issues/26), [#27](https://github.com/paunrv/fermentrack/issues/27)); E3 [#62](https://github.com/paunrv/fermentrack/issues/62) les agrega la capa de límites.

## Mapa de issues

| Epic | # | Issues |
|------|---|--------|
| A — Pipeline home | [#35](https://github.com/paunrv/fermentrack/issues/35) | [#39](https://github.com/paunrv/fermentrack/issues/39)–[#44](https://github.com/paunrv/fermentrack/issues/44) |
| B — Rail | [#36](https://github.com/paunrv/fermentrack/issues/36) | [#45](https://github.com/paunrv/fermentrack/issues/45)–[#47](https://github.com/paunrv/fermentrack/issues/47) |
| C — Chat | [#37](https://github.com/paunrv/fermentrack/issues/37) | [#48](https://github.com/paunrv/fermentrack/issues/48)–[#52](https://github.com/paunrv/fermentrack/issues/52) |
| D — Inventario | [#38](https://github.com/paunrv/fermentrack/issues/38) | [#53](https://github.com/paunrv/fermentrack/issues/53)–[#58](https://github.com/paunrv/fermentrack/issues/58) |
| E — Planes | [#59](https://github.com/paunrv/fermentrack/issues/59) | [#60](https://github.com/paunrv/fermentrack/issues/60)–[#66](https://github.com/paunrv/fermentrack/issues/66) |
