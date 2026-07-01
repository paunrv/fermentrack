# PROOF · i18n smoke QA (L8)

Checklist manual para cerrar el epic [#13](https://github.com/paunrv/fermentrack/issues/13).  
Ejecutar **es-MX** y **en-US** (Ajustes → idioma o `LocaleSwitcher` en landing).

## Setup

- [ ] `NEXT_PUBLIC_SITE_URL` definido en producción (metadata canonical / sitemap)
- [ ] Cookie `NEXT_LOCALE` persiste al recargar

## Páginas públicas (view-source)

Por cada locale, verificar `<html lang="…">`, `<title>` y `<meta name="description">` traducidos:

| Ruta | es-MX | en-US |
|------|-------|-------|
| `/` | | |
| `/nosotros` | | |
| `/contacto` | | |
| `/privacidad` | | |
| `/terminos` | | |

- [ ] `<link rel="alternate" hreflang="es-MX">` presente en páginas públicas
- [ ] `<link rel="alternate" hreflang="en-US">` presente
- [ ] `<link rel="canonical">` apunta a `NEXT_PUBLIC_SITE_URL` + ruta

## SEO técnico

- [ ] `/sitemap.xml` responde 200 y lista rutas públicas
- [ ] `/robots.txt` referencia el sitemap y bloquea `/dashboard/`

## Auth y onboarding

| Flujo | es-MX | en-US |
|-------|-------|-------|
| Sign-in | | |
| Profile select | | |
| Onboarding | | |

## Dashboard (muestra por vertical)

| Área | Pantalla | es-MX | en-US |
|------|----------|-------|-------|
| Distribuidor | Inicio / inventario / pedido | | |
| Distribuidor | Crédito + redactar cobro (agente) | | |
| Winemaker | Lotes / documentos | | |
| Destilador | Lotes / bodega | | |

## Agente PROOF

- [ ] Barra contextual responde en español con UI es-MX
- [ ] Barra contextual responde en inglés con UI en-US
- [ ] `/dashboard/agente` — system prompt y errores de conexión localizados

## PDFs (jsPDF)

| Export | es-MX | en-US |
|--------|-------|-------|
| Preview pedido (detalle) | | |
| Remisión entregada (server) | | |

## Regresión rápida

- [ ] Cambiar idioma no rompe navegación ni canvas
- [ ] Fechas y MXN formatean según locale (`formatDate`, `formatCurrencyMxn`)

---

Firmado: _______________  Fecha: _______________
