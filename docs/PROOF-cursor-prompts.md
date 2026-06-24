# PROOF — Prompts para Cursor
## Solo capas estables. No tocar hasta tener respuestas de Aldo: vessels, lot_relationships, mlf.

---

## PROMPT 1 — Capa de Identidad / Multitenancy

```
Estoy construyendo PROOF, una app de gestión de bodegas en Supabase + Next.js + TypeScript.

Crea la migración SQL para la capa de identidad con estas reglas exactas:

REGLAS GENERALES:
- Todas las tablas tienen: id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now()
- Todas las tablas de negocio tienen organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
- Habilitar RLS en todas las tablas
- La política RLS base para todas las tablas de negocio es: el usuario debe ser miembro activo de la organization_id del registro

TABLAS A CREAR:

1. organizations
   - id, created_at
   - name text NOT NULL
   - slug text NOT NULL UNIQUE
   - plan text NOT NULL DEFAULT 'free' -- 'free' | 'pro' | 'enterprise'
   - settings jsonb NOT NULL DEFAULT '{}'

2. profiles
   - Extiende auth.users de Supabase (trigger en INSERT de auth.users)
   - id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
   - full_name text
   - avatar_url text
   - created_at

3. organization_members
   - id, created_at
   - organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
   - user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
   - role text NOT NULL DEFAULT 'member' -- 'owner' | 'admin' | 'member' | 'viewer'
   - status text NOT NULL DEFAULT 'active' -- 'active' | 'invited' | 'suspended'
   - invited_by uuid REFERENCES profiles(id)
   - UNIQUE (organization_id, user_id)

POLÍTICAS RLS:
- organizations: SELECT para miembros activos. INSERT libre (cualquiera puede crear una org). UPDATE solo owners.
- profiles: SELECT propio. UPDATE propio.
- organization_members: SELECT para miembros de la misma org. INSERT solo owners/admins. UPDATE solo owners.

FUNCIÓN HELPER a crear:
- auth.organization_ids() → uuid[] : devuelve los organization_ids donde el usuario autenticado es miembro activo. Usarla en todas las políticas RLS del resto del sistema.

TAMBIÉN:
- Trigger: cuando se inserta en auth.users, crear automáticamente el profile correspondiente.
- Trigger: cuando alguien crea una organization, insertarlo como 'owner' en organization_members automáticamente.

Genera solo el archivo de migración SQL. Sin comentarios innecesarios. Nombres de archivo: 001_identity.sql
```

---

## PROMPT 2 — Capa de Catálogos

```
Continuando con PROOF en Supabase. La migración 001_identity.sql ya existe.
Ya existe la función helper auth.organization_ids() para RLS.

Crea la migración SQL para la capa de catálogos (entidades de referencia del dominio vitivinícola).

CONTEXTO DE DOMINIO (importante para entender las decisiones):
- Una bodega puede tener viñedos propios y comprar uva a terceros (ownership_type).
- Un viñedo se divide en bloques (parcelas/cuarteles) con varietal propio.
- Un vintage es un año de cosecha. Es único por organización y año.
- Un harvest_cut es un corte de cosecha específico: una hectárea puede cosecharse en 2-3 fechas distintas con destinos distintos (espumoso vs blanco vs tinto). Confirmado por el enólogo Aldo.
- intended_style es el destino del corte al momento de cosechar, no una decisión post-fermentación.

TABLAS A CREAR (en este orden por dependencias):

1. varietals
   - id, created_at, organization_id
   - name text NOT NULL
   - color text -- 'white' | 'red' | 'rosé' | 'orange'
   - category text NOT NULL DEFAULT 'grape' -- 'grape' | 'grain' | 'agave' -- para multi-industria futuro
   - UNIQUE (organization_id, name)

2. vintages
   - id, created_at, organization_id
   - year int NOT NULL CHECK (year >= 1800 AND year <= 2200)
   - notes text
   - status text NOT NULL DEFAULT 'active' -- 'planned' | 'active' | 'completed'
   - UNIQUE (organization_id, year)

3. vineyards
   - id, created_at, organization_id
   - name text NOT NULL
   - location text -- descripción libre, ej: "Valle de Guadalupe, BC"
   - area_ha numeric CHECK (area_ha > 0)
   - ownership_type text NOT NULL DEFAULT 'own' -- 'own' | 'contracted' | 'purchased'
   - notes text

4. blocks
   - id, created_at, organization_id
   - vineyard_id uuid NOT NULL REFERENCES vineyards(id) ON DELETE CASCADE
   - varietal_id uuid REFERENCES varietals(id) ON DELETE SET NULL
   - name text NOT NULL -- ej: "Bloque Norte", "Cuartel 3"
   - area_ha numeric CHECK (area_ha > 0)
   - planted_year int
   - notes text
   - UNIQUE (vineyard_id, name)

5. harvest_cuts
   - id, created_at, organization_id
   - vintage_id uuid NOT NULL REFERENCES vintages(id) ON DELETE CASCADE
   - block_id uuid REFERENCES blocks(id) ON DELETE SET NULL -- nullable: puede venir de proveedor sin bloque propio
   - vineyard_id uuid REFERENCES vineyards(id) ON DELETE SET NULL -- desnormalizado para query rápido
   - varietal_id uuid REFERENCES varietals(id) ON DELETE SET NULL
   - cut_number int NOT NULL DEFAULT 1 -- primer corte, segundo corte, etc.
   - intended_style text NOT NULL -- 'sparkling' | 'white' | 'rosé' | 'red' | 'orange' | 'dessert'
   - cut_date date NOT NULL
   - weight_kg numeric CHECK (weight_kg > 0)
   - notes text
   - UNIQUE (vintage_id, block_id, cut_number) -- misma parcela no puede tener dos cortes con el mismo número

POLÍTICAS RLS para todas las tablas:
- SELECT: auth.organization_ids() @> ARRAY[organization_id]
- INSERT: auth.organization_ids() @> ARRAY[organization_id]
- UPDATE: auth.organization_ids() @> ARRAY[organization_id]
- DELETE: solo para varietals, vineyards, blocks (soft delete vía status si preferible)

ÍNDICES:
- vintages: (organization_id, year)
- harvest_cuts: (vintage_id), (block_id), (intended_style)

Genera solo el archivo SQL. Nombre: 002_catalogs.sql
```

---

## PROMPT 3 — Capa de Event Core

```
Continuando con PROOF en Supabase. Existen 001_identity.sql y 002_catalogs.sql.

Crea la migración SQL para el núcleo del sistema: la tabla de eventos append-only y las tablas derivadas confirmadas.

PRINCIPIO RECTOR (importante):
- events es el log histórico inmutable de todo lo que ocurre en una bodega.
- NUNCA se actualiza ni se borra un registro de events. Ni el admin puede.
- Si algo se cargó mal, se inserta un evento de corrección con payload->>'corrects_event_id'.
- lots es el sujeto sobre el que ocurren los eventos.
- lot_grape_inputs es la tabla que responde "qué uvas entraron a este tanque" — confirmado por el enólogo Aldo como requerimiento crítico.

TABLAS A CREAR:

1. lots
   - id, created_at, organization_id
   - vintage_id uuid REFERENCES vintages(id) ON DELETE SET NULL -- nullable: cerveza futura
   - code text NOT NULL -- código interno, ej: "LOT-2026-001"
   - product_type text NOT NULL DEFAULT 'wine' -- 'wine' | 'beer' | 'spirit'
   - current_stage text -- proyección actualizada por trigger: 'harvest' | 'fermentation' | 'aging' | 'bottled'
   - status text NOT NULL DEFAULT 'active' -- 'active' | 'completed' | 'discarded'
   - notes text
   - UNIQUE (organization_id, code)

2. lot_grape_inputs
   -- Responde: "¿qué uvas, de dónde y cuándo, entraron a este lote/tanque?"
   - id, created_at, organization_id
   - lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE
   - harvest_cut_id uuid REFERENCES harvest_cuts(id) ON DELETE SET NULL -- el corte específico
   - vineyard_id uuid REFERENCES vineyards(id) ON DELETE SET NULL -- desnorm. para query
   - varietal_id uuid REFERENCES varietals(id) ON DELETE SET NULL -- desnorm. para query
   - weight_kg numeric NOT NULL CHECK (weight_kg > 0)
   - received_at timestamptz NOT NULL -- puede diferir de la fecha de corte
   - intended_style text -- hereda del harvest_cut pero puede sobreescribirse
   - notes text

3. events
   -- APPEND-ONLY. Sin UPDATE, sin DELETE a nivel de política RLS.
   - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
   - lot_id uuid REFERENCES lots(id) ON DELETE SET NULL
   - vintage_id uuid REFERENCES vintages(id) ON DELETE SET NULL
   - vineyard_id uuid REFERENCES vineyards(id) ON DELETE SET NULL
   - event_type text NOT NULL -- ej: 'FERMENTATION_STARTED', 'WINEMAKER_NOTE'
   - payload jsonb NOT NULL DEFAULT '{}'
   - occurred_at timestamptz NOT NULL -- cuándo pasó en la realidad (puede cargarse retroactivo)
   - recorded_at timestamptz NOT NULL DEFAULT now() -- cuándo se cargó al sistema
   - actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL
   - evidence_ids uuid[] DEFAULT '{}' -- referencias a archivos (tabla evidence viene después)
   - created_at timestamptz NOT NULL DEFAULT now()
   -- SIN updated_at intencionalmente

ÍNDICES para events:
   - (organization_id, occurred_at DESC)
   - (lot_id, occurred_at DESC)
   - (event_type)
   - GIN (payload) -- para búsquedas dentro del jsonb

TRIGGER en events — proyectar current_stage en lots:
   Cuando se inserta un evento, actualizar lots.current_stage según event_type:
   - 'HARVEST_STARTED' | 'GRAPE_RECEIVED' → 'harvest'
   - 'FERMENTATION_STARTED' → 'fermentation'
   - 'MALOLACTIC_STARTED' → 'malolactic'
   - 'AGING_STARTED' → 'aging'
   - 'BOTTLING_STARTED' → 'bottling'
   - 'BOTTLING_COMPLETED' → 'bottled'
   Solo actualizar si el nuevo stage es "posterior" al actual (no retroceder).

POLÍTICAS RLS:
   - lots: SELECT/INSERT/UPDATE con organization_id check estándar.
   - lot_grape_inputs: SELECT/INSERT con organization_id check. Sin UPDATE ni DELETE.
   - events:
     * SELECT: auth.organization_ids() @> ARRAY[organization_id]
     * INSERT: auth.organization_ids() @> ARRAY[organization_id]
     * UPDATE: DENEGADO para todos (WITH CHECK (false))
     * DELETE: DENEGADO para todos (USING (false))

VISTA de conveniencia — notas del enólogo:
   CREATE VIEW winemaker_notes AS
   SELECT
     id, lot_id, vintage_id,
     payload->>'text' AS text,
     occurred_at,
     actor_id
   FROM events
   WHERE event_type IN ('WINEMAKER_NOTE','VINTAGE_OBSERVATION','TASTING_NOTE','DECISION_RECORDED');

TIPOS TypeScript a generar también (en /types/proof.ts):
   - EventType: union literal de todos los event_types del catálogo (HARVEST_STARTED, FERMENTATION_STARTED, etc.)
   - LotStage: union literal de los stages
   - Database: el tipo Supabase generado (ejecutar: npx supabase gen types typescript)

Genera: 003_event_core.sql y types/proof.ts
```

---

## PROMPT 4 — Seed data para desarrollo

```
Continuando con PROOF. Las migraciones 001, 002 y 003 ya existen.

Crea un archivo seed.sql con datos de prueba realistas para la bodega "Viñas del Tigre" (enólogo: Aldo).

DATOS A INSERTAR:

1. Una organization: { name: 'Viñas del Tigre', slug: 'vinas-del-tigre' }

2. Varietals: Tempranillo, Cabernet Sauvignon, Chardonnay, Nebbiolo (todos color y category correspondientes)

3. Vintages: 2024 (completed), 2025 (completed), 2026 (active)

4. Vineyards: 
   - "Viñedo El Tigre" (own, 8ha)
   - "Proveedor García" (purchased, null ha)

5. Blocks (solo para Viñedo El Tigre):
   - "Bloque Norte" — Tempranillo — 3ha — planted 2005
   - "Bloque Sur" — Chardonnay — 2ha — planted 2010
   - "Bloque Centro" — Cabernet Sauvignon — 3ha — planted 2008

6. Harvest cuts para vintage 2026:
   - Bloque Sur / Chardonnay / corte 1 / 2026-08-02 / espumoso / 1200kg
   - Bloque Sur / Chardonnay / corte 2 / 2026-08-24 / white / 3800kg
   - Bloque Norte / Tempranillo / corte 1 / 2026-09-15 / red / 6000kg

7. Lots:
   - LOT-2026-001 (wine, vintage 2026, stage: fermentation)
   - LOT-2026-002 (wine, vintage 2026, stage: harvest)

8. Lot grape inputs para LOT-2026-001:
   - Chardonnay corte 2 → 3800kg recibidos 2026-08-24

9. Events para LOT-2026-001 (en orden cronológico):
   - GRAPE_RECEIVED (occurred_at: 2026-08-24, payload: { weight_kg: 3800, varietal: 'Chardonnay' })
   - FERMENTATION_STARTED (occurred_at: 2026-08-26, payload: { temp_c: 16, brix: 22.5, vessel_note: 'Tanque 3' })
   - FERMENTATION_MONITORING (occurred_at: 2026-08-27, payload: { temp_c: 17, brix: 20.1, activity: 'active', notes: 'Burbujeo normal' })
   - WINEMAKER_NOTE (occurred_at: 2026-08-28, payload: { text: 'Fermentación arrancó muy bien. Sin correcciones por ahora.' })

Usa UUIDs fijos (gen_random_uuid() está bien para seed) o hardcodeados para que los tests sean reproducibles.
Archivo: supabase/seed.sql
```

---

## Notas para Cursor

- Stack: Supabase (Postgres 15), Next.js 14 App Router, TypeScript strict
- Usar `supabase/migrations/` para los archivos SQL
- No instalar librerías nuevas para estas migraciones — son SQL puro
- Después de cada migración: `npx supabase db reset` para verificar que aplica limpio
- Las capas 4+ (vessels, lot_relationships, mlf events) se agregan cuando Aldo responda las preguntas pendientes. No adelantarse.
