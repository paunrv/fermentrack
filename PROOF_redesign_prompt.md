# PROOF — Rediseño Visual Completo

Lee @PROOF_CONTEXT.md antes de cualquier cambio.

## Contexto del rediseño

El diseño actual es demasiado denso — mucho texto, muchas listas,
demasiado sidebar. Lo reemplazamos con una experiencia de canvas
conversacional: blanca, minimalista, laboratorio.

El Patrón no navega — le habla al agente y el agente responde
con lo que necesita ver.

---

## Filosofía del nuevo diseño

ANTES: dashboard con sidebar + listas + tablas + formularios
AHORA: canvas limpio + agente central + objetos visuales

- Fondo: #F8F7F4 (blanco cálido, no frío)
- Sin sidebar permanente
- Sin tablas
- Sin texto denso
- El agente ES la navegación
- Los lotes/SKUs son objetos visuales, no filas

---

## Sistema de color por tipo de usuario

### Distribuidor
- Acento: #378ADD (azul)
- Línea topbar: 2px solid #378ADD
- Badge: background #378ADD18, color #378ADD
- Punto agente: #378ADD
- Avatar: background #378ADD18, color #378ADD

### Destilador
- Acento: #C8A96E (dorado)
- Línea topbar: 2px solid #C8A96E
- Badge: background #C8A96E18, color #C8A96E
- Punto agente: #C8A96E (pulsante)
- Avatar: background #C8A96E

---

## Layout global

TOPBAR (fijo, 56px)
├── Logo PROOF (izq)
├── Badge tipo usuario (junto al logo)
└── Membresía + Avatar (der)

CANVAS (scroll infinito)
├── ZONA AGENTE (centrada, max-width 560px)
│   ├── Input conversacional con punto pulsante
│   ├── Respuesta contextual del agente
│   └── Quick actions (chips horizontales)
├── DIVIDER (línea con label: "Bodega — N lotes")
├── PANEL DETALLE (si hay lote seleccionado)
│   └── Se inserta aquí, empuja el grid hacia abajo
└── GRID DE OBJETOS VISUALES (infinito hacia abajo)
    └── Botellas (destilador) o SKU cards (distribuidor)

Sin sidebar. Sin nav fija. Todo en el canvas.

---

## Topbar

background: #F8F7F4
border-bottom: 0.5px solid #E8E6E0
padding: 14px 24px, height: 56px
Logo: font-size 13px, font-weight 500, letter-spacing 0.15em
      color #1A1A1A, "OF" en color acento del perfil
Badge tipo: font-size 9px, monospace, border-radius 4px, padding 3px 8px
Membresía: font-size 10px, color #BBB, monospace
Avatar
