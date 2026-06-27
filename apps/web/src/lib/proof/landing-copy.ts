export type LandingLang = 'es' | 'en' | 'fr' | 'it'

export type ProducerTab = 'winemaker' | 'brewer' | 'distiller'

export const PRODUCER_TAB_COLORS: Record<ProducerTab, string> = {
  winemaker: '#6940A5',
  brewer: '#CB912F',
  distiller: '#0F7B6C',
}

export interface ProducerTabContent {
  label: Record<LandingLang, string>
  bullets: Record<LandingLang, string[]>
  timelineTitle: Record<LandingLang, string>
  stages: { label: Record<LandingLang, string>; status: 'done' | 'active' | 'pending' }[]
}

export const PRODUCER_TABS: Record<ProducerTab, ProducerTabContent> = {
  winemaker: {
    label: { es: 'Winemaker', en: 'Winemaker', fr: 'Vigneron', it: 'Enologo' },
    bullets: {
      es: [
        '🍷 Timeline completo de cada lote — desde la cosecha hasta la botella',
        '📋 Protocolos por estilo — tinto, blanco, espumoso, rosado',
        '🎙️ Agente de voz — dicta en bodega y PROOF registra',
        '💡 "¿qué lotes están listos para embotellar?"',
      ],
      en: [
        '🍷 Full timeline for every lot — from harvest to bottle',
        '📋 Protocols by style — red, white, sparkling, rosé',
        '🎙️ Voice agent — dictate in the cellar and PROOF records it',
        '💡 "Which lots are ready to bottle?"',
      ],
      fr: [
        '🍷 Chronologie complète de chaque lot — de la vendange à la bouteille',
        '📋 Protocoles par style — rouge, blanc, effervescent, rosé',
        '🎙️ Agent vocal — dictez en cave et PROOF enregistre',
        '💡 "Quels lots sont prêts à être mis en bouteille ?"',
      ],
      it: [
        '🍷 Timeline completa di ogni lotto — dalla vendemmia alla bottiglia',
        '📋 Protocolli per stile — rosso, bianco, spumante, rosato',
        '🎙️ Agente vocale — detta in cantina e PROOF registra',
        '💡 "Quali lotti sono pronti per l\'imbottigliamento?"',
      ],
    },
    timelineTitle: {
      es: 'LOT-2026-001 · Chardonnay · Viñas del Tigre',
      en: 'LOT-2026-001 · Chardonnay · Viñas del Tigre',
      fr: 'LOT-2026-001 · Chardonnay · Viñas del Tigre',
      it: 'LOT-2026-001 · Chardonnay · Viñas del Tigre',
    },
    stages: [
      { label: { es: 'Cosecha', en: 'Harvest', fr: 'Vendange', it: 'Vendemmia' }, status: 'done' },
      { label: { es: 'Análisis', en: 'Analysis', fr: 'Analyse', it: 'Analisi' }, status: 'done' },
      { label: { es: 'Fermentación', en: 'Fermentation', fr: 'Fermentation', it: 'Fermentazione' }, status: 'active' },
      { label: { es: 'Maloláctica', en: 'Malolactic', fr: 'Malolactique', it: 'Malolattica' }, status: 'pending' },
      { label: { es: 'Crianza', en: 'Aging', fr: 'Élevage', it: 'Affinamento' }, status: 'pending' },
      { label: { es: 'Embotellado', en: 'Bottling', fr: 'Mise en bouteille', it: 'Imbottigliamento' }, status: 'pending' },
    ],
  },
  brewer: {
    label: { es: 'Brewer', en: 'Brewer', fr: 'Brasseur', it: 'Birraio' },
    bullets: {
      es: [
        '🍺 Control de recetas (grain bill, lúpulos, levadura) por batch',
        '📋 Protocolos por estilo — IPA, Stout, Lager, Sour, Witbier',
        '🌡️ Monitoreo de fermentación y densidad (OG/FG) con alertas',
        '💡 "¿cuántos litros de IPA tengo disponibles?"',
      ],
      en: [
        '🍺 Recipe control (grain bill, hops, yeast) per batch',
        '📋 Protocols by style — IPA, Stout, Lager, Sour, Witbier',
        '🌡️ Fermentation and density monitoring (OG/FG) with alerts',
        '💡 "How many liters of IPA do I have available?"',
      ],
      fr: [
        '🍺 Contrôle des recettes (grain bill, houblon, levure) par batch',
        '📋 Protocoles par style — IPA, Stout, Lager, Sour, Witbier',
        '🌡️ Suivi de fermentation et densité (OG/FG) avec alertes',
        '💡 "Combien de litres d\'IPA ai-je disponibles ?"',
      ],
      it: [
        '🍺 Controllo ricette (grain bill, luppolo, lievito) per batch',
        '📋 Protocolli per stile — IPA, Stout, Lager, Sour, Witbier',
        '🌡️ Monitoraggio fermentazione e densità (OG/FG) con alerte',
        '💡 "Quanti litri di IPA ho disponibili?"',
      ],
    },
    timelineTitle: {
      es: 'BATCH-2026-008 · West Coast IPA · Cervecería Norte',
      en: 'BATCH-2026-008 · West Coast IPA · Cervecería Norte',
      fr: 'BATCH-2026-008 · West Coast IPA · Cervecería Norte',
      it: 'BATCH-2026-008 · West Coast IPA · Cervecería Norte',
    },
    stages: [
      { label: { es: 'Maceración', en: 'Mashing', fr: 'Brassage', it: 'Ammostamento' }, status: 'done' },
      { label: { es: 'Cocción', en: 'Boil', fr: 'Ébullition', it: 'Bollitura' }, status: 'done' },
      { label: { es: 'Fermentación', en: 'Fermentation', fr: 'Fermentation', it: 'Fermentazione' }, status: 'active' },
      { label: { es: 'Dry hopping', en: 'Dry hopping', fr: 'Dry hopping', it: 'Dry hopping' }, status: 'pending' },
      { label: { es: 'Maduración', en: 'Conditioning', fr: 'Maturation', it: 'Maturazione' }, status: 'pending' },
      { label: { es: 'Envasado', en: 'Packaging', fr: 'Conditionnement', it: 'Confezionamento' }, status: 'pending' },
    ],
  },
  distiller: {
    label: { es: 'Destilador', en: 'Distiller', fr: 'Distillateur', it: 'Distillatore' },
    bullets: {
      es: [
        '🌵 Trazabilidad completa desde la jima hasta el envasado',
        '📋 Protocolos por categoría — blanco, reposado, añejo, extra añejo',
        '✂️ Registro de cortes (cabezas, corazón, colas) con decisiones del maestro',
        '💡 "¿cuánto reposado tengo listo para embotellar?"',
      ],
      en: [
        '🌵 Full traceability from harvest to packaging',
        '📋 Protocols by category — blanco, reposado, añejo, extra añejo',
        '✂️ Cut logging (heads, hearts, tails) with master distiller decisions',
        '💡 "How much reposado is ready to bottle?"',
      ],
      fr: [
        '🌵 Traçabilité complète de la récolte au conditionnement',
        '📋 Protocoles par catégorie — blanco, reposado, añejo, extra añejo',
        '✂️ Enregistrement des coupes (têtes, cœur, queues) avec décisions du maître',
        '💡 "Combien de reposado est prêt à être mis en bouteille ?"',
      ],
      it: [
        '🌵 Tracciabilità completa dalla raccolta al confezionamento',
        '📋 Protocolli per categoria — blanco, reposado, añejo, extra añejo',
        '✂️ Registro tagli (teste, cuore, code) con decisioni del maestro',
        '💡 "Quanto reposado è pronto per l\'imbottigliamento?"',
      ],
    },
    timelineTitle: {
      es: 'LOTE-2026-003 · Reposado · Destilería Aculla',
      en: 'LOTE-2026-003 · Reposado · Destilería Aculla',
      fr: 'LOTE-2026-003 · Reposado · Destilería Aculla',
      it: 'LOTE-2026-003 · Reposado · Destilería Aculla',
    },
    stages: [
      { label: { es: 'Jima', en: 'Harvest', fr: 'Récolte', it: 'Raccolta' }, status: 'done' },
      { label: { es: 'Cocción', en: 'Cooking', fr: 'Cuisson', it: 'Cottura' }, status: 'done' },
      { label: { es: 'Fermentación', en: 'Fermentation', fr: 'Fermentation', it: 'Fermentazione' }, status: 'done' },
      { label: { es: 'Destilación', en: 'Distillation', fr: 'Distillation', it: 'Distillazione' }, status: 'active' },
      { label: { es: 'Reposo', en: 'Resting', fr: 'Repos', it: 'Riposo' }, status: 'pending' },
      { label: { es: 'Envasado', en: 'Packaging', fr: 'Conditionnement', it: 'Confezionamento' }, status: 'pending' },
    ],
  },
}

export interface LandingCopy {
  nav: {
    productores: string
    distribuidores: string
    precios: string
    logIn: string
    startFree: string
    goDashboard: string
  }
  hero: {
    tag: string
    headlineLine1: string
    headlineLine2: string
    subtitleLine1: string
    subtitleLine2: string
    subtitleHighlight: string
    body: string
    ctaDemo: string
    ctaStart: string
    mockup: {
      userLabel: string
      liveLabel: string
      alerts: { tone: 'warn' | 'info' | 'ok'; title: string; meta: string }[]
    }
  }
  contrast: {
    title: string
    subtitle: string
    cards: { title: string; body: string }[]
  }
  productores: {
    eyebrow: string
    title: string
    subtitle: string
  }
  distribuidores: {
    eyebrow: string
    title: string
    subtitle: string
    bullets: string[]
  }
  upload: {
    eyebrow: string
    title: string
    subtitle: string
    items: string[]
  }
  pricing: {
    eyebrow: string
    title: string
    plans: {
      name: string
      price: string
      period: string
      description: string
      features: string[]
      cta: string
      highlighted?: boolean
    }[]
  }
  finalCta: {
    title: string
    subtitle: string
    inputPlaceholder: string
    cta: string
  }
  footer: {
    tagline: string
    product: string
    company: string
    legal: string
    copyright: string
  }
  upgradeModal: {
    title: string
    body: string
    seePlans: string
    stayBasic: string
  }
}

const COPY: Record<LandingLang, LandingCopy> = {
  es: {
    nav: {
      productores: 'Productores',
      distribuidores: 'Distribuidores',
      precios: 'Precios',
      logIn: 'Log in',
      startFree: 'Empieza gratis',
      goDashboard: 'Ir a mi dashboard',
    },
    hero: {
      tag: '// AI-native operating system',
      headlineLine1: 'Every bottle tells a story.',
      headlineLine2: 'We track the proof.',
      subtitleLine1: 'PROOF no es un ERP.',
      subtitleLine2: 'Es la memoria operativa de tu producción.',
      subtitleHighlight: 'memoria operativa',
      body: 'Sube cualquier documento, foto o nota. PROOF extrae, conecta y hace tu operación inteligente.',
      ctaDemo: 'Ver demo',
      ctaStart: 'Empieza gratis',
      mockup: {
        userLabel: 'Aldo · Winemaker',
        liveLabel: 'En vivo',
        alerts: [
          {
            tone: 'warn',
            title: 'Fermentación fuera de rango',
            meta: 'LOT-2026-001 · Chardonnay',
          },
          {
            tone: 'info',
            title: '3 lotes listos para embotellar',
            meta: 'Viñas del Tigre · esta semana',
          },
          {
            tone: 'ok',
            title: 'Recepción confirmada',
            meta: 'OC-284 · 120 cajas',
          },
        ],
      },
    },
    contrast: {
      title: 'Los ERPs registran. PROOF entiende.',
      subtitle: 'No reemplazamos tu contabilidad. Le damos memoria a tu operación líquida.',
      cards: [
        {
          title: 'Registro vs. contexto',
          body: 'Un ERP guarda números. PROOF entiende que el lote 2026-001 está en maloláctica y que el maestro decidió esperar 48 horas más.',
        },
        {
          title: 'Formularios vs. conversación',
          body: 'Dicta en bodega, sube una foto de ticket o pregunta en español. PROOF estructura la información sin interrumpir tu flujo.',
        },
        {
          title: 'Reportes vs. respuestas',
          body: 'No busques en diez pantallas. Pregunta "¿qué lotes están listos?" y obtén la respuesta con el contexto completo.',
        },
      ],
    },
    productores: {
      eyebrow: 'Para productores',
      title: 'Un timeline vivo para cada lote',
      subtitle: 'Vino, cerveza o destilado — PROOF adapta protocolos, etapas y alertas a tu categoría.',
    },
    distribuidores: {
      eyebrow: 'Para distribuidores',
      title: 'Inventario, pedidos y crédito en un solo lugar',
      subtitle: 'Desde la recepción de mercancía hasta el cobro al cliente.',
      bullets: [
        '📦 Recepción inteligente — fotografía el pallet y PROOF cruza contra tu OC',
        '🛒 Toma de pedidos con stock en tiempo real y reglas de crédito',
        '💳 Cartera y cobranza — saldo por cliente, límites y alertas de vencimiento',
        '📊 KPIs operativos — rotación, márgenes y SKUs críticos sin exportar a Excel',
      ],
    },
    upload: {
      eyebrow: 'Upload anything',
      title: 'Sube lo que tengas. PROOF lo entiende.',
      subtitle: 'Tickets, facturas, notas de remisión, fotos de etiquetas — cualquier formato.',
      items: ['📸 Foto de ticket o factura', '🎙️ Nota de voz en bodega', '📄 PDF o Excel de inventario', '💬 Pregunta en lenguaje natural'],
    },
    pricing: {
      eyebrow: 'Precios',
      title: 'Planes que crecen con tu operación',
      plans: [
        {
          name: 'Básico',
          price: '$0',
          period: '/mes',
          description: 'Para empezar a dar memoria a tu operación.',
          features: ['Timeline de lotes', 'Registro manual y chat', '1 usuario', 'Historial 90 días'],
          cta: 'Empieza gratis',
        },
        {
          name: 'Pro',
          price: '$29',
          period: '/mes',
          description: 'Para equipos que operan en tiempo real.',
          features: [
            'Agente de voz',
            'Foto inteligente',
            'Subusuarios ilimitados',
            'Alertas y protocolos',
            'Historial completo',
          ],
          cta: 'Empezar con Pro',
          highlighted: true,
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          period: '',
          description: 'Para grupos con múltiples sitios y integraciones.',
          features: ['Multi-sitio', 'API e integraciones', 'SLA dedicado', 'Onboarding personalizado'],
          cta: 'Contactar',
        },
      ],
    },
    finalCta: {
      title: 'Dale memoria a tu operación.',
      subtitle: 'Every bottle tells a story. We track the proof.',
      inputPlaceholder: 'tu@email.com',
      cta: 'Empieza gratis',
    },
    footer: {
      tagline: 'Memoria operativa para producción líquida.',
      product: 'Producto',
      company: 'Empresa',
      legal: 'Legal',
      copyright: '© 2026 PROOF. Todos los derechos reservados.',
    },
    upgradeModal: {
      title: 'Esta función es parte del plan Pro',
      body: 'Agente de voz, foto inteligente y subusuarios incluidos desde $29/mes.',
      seePlans: 'Ver planes',
      stayBasic: 'Seguir en básico',
    },
  },
  en: {
    nav: {
      productores: 'Producers',
      distribuidores: 'Distributors',
      precios: 'Pricing',
      logIn: 'Log in',
      startFree: 'Start free',
      goDashboard: 'Go to my dashboard',
    },
    hero: {
      tag: '// AI-native operating system',
      headlineLine1: 'Every bottle tells a story.',
      headlineLine2: 'We track the proof.',
      subtitleLine1: 'PROOF is not an ERP.',
      subtitleLine2: 'It is the operational memory of your production.',
      subtitleHighlight: 'operational memory',
      body: 'Upload any document, photo or note. PROOF extracts, connects and makes your operation intelligent.',
      ctaDemo: 'See demo',
      ctaStart: 'Start free',
      mockup: {
        userLabel: 'Aldo · Winemaker',
        liveLabel: 'Live',
        alerts: [
          {
            tone: 'warn',
            title: 'Fermentation out of range',
            meta: 'LOT-2026-001 · Chardonnay',
          },
          {
            tone: 'info',
            title: '3 lots ready to bottle',
            meta: 'Viñas del Tigre · this week',
          },
          {
            tone: 'ok',
            title: 'Receiving confirmed',
            meta: 'PO-284 · 120 cases',
          },
        ],
      },
    },
    contrast: {
      title: 'ERPs record. PROOF understands.',
      subtitle: 'We do not replace your accounting. We give memory to your liquid operation.',
      cards: [
        {
          title: 'Records vs. context',
          body: 'An ERP stores numbers. PROOF understands that lot 2026-001 is in malolactic and the winemaker chose to wait 48 more hours.',
        },
        {
          title: 'Forms vs. conversation',
          body: 'Dictate in the cellar, upload a ticket photo, or ask in plain language. PROOF structures the info without breaking your flow.',
        },
        {
          title: 'Reports vs. answers',
          body: 'No hunting through ten screens. Ask "which lots are ready?" and get the answer with full context.',
        },
      ],
    },
    productores: {
      eyebrow: 'For producers',
      title: 'A living timeline for every lot',
      subtitle: 'Wine, beer, or spirits — PROOF adapts protocols, stages, and alerts to your category.',
    },
    distribuidores: {
      eyebrow: 'For distributors',
      title: 'Inventory, orders, and credit in one place',
      subtitle: 'From goods receipt to customer collection.',
      bullets: [
        '📦 Smart receiving — photograph the pallet and PROOF matches your PO',
        '🛒 Order taking with real-time stock and credit rules',
        '💳 Portfolio and collections — balance per customer, limits, and due alerts',
        '📊 Operational KPIs — turnover, margins, and critical SKUs without Excel exports',
      ],
    },
    upload: {
      eyebrow: 'Upload anything',
      title: 'Upload what you have. PROOF understands.',
      subtitle: 'Tickets, invoices, delivery notes, label photos — any format.',
      items: ['📸 Ticket or invoice photo', '🎙️ Voice note in the cellar', '📄 PDF or Excel inventory', '💬 Ask in natural language'],
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'Plans that grow with your operation',
      plans: [
        {
          name: 'Basic',
          price: '$0',
          period: '/mo',
          description: 'Start giving memory to your operation.',
          features: ['Lot timeline', 'Manual logging and chat', '1 user', '90-day history'],
          cta: 'Start free',
        },
        {
          name: 'Pro',
          price: '$29',
          period: '/mo',
          description: 'For teams operating in real time.',
          features: [
            'Voice agent',
            'Smart photo',
            'Unlimited sub-users',
            'Alerts and protocols',
            'Full history',
          ],
          cta: 'Start with Pro',
          highlighted: true,
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          period: '',
          description: 'For groups with multiple sites and integrations.',
          features: ['Multi-site', 'API and integrations', 'Dedicated SLA', 'Custom onboarding'],
          cta: 'Contact us',
        },
      ],
    },
    finalCta: {
      title: 'Give your operation a memory.',
      subtitle: 'Every bottle tells a story. We track the proof.',
      inputPlaceholder: 'you@email.com',
      cta: 'Start free',
    },
    footer: {
      tagline: 'Operational memory for liquid production.',
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      copyright: '© 2026 PROOF. All rights reserved.',
    },
    upgradeModal: {
      title: 'This feature is part of the Pro plan',
      body: 'Voice agent, smart photo, and sub-users included from $29/mo.',
      seePlans: 'See plans',
      stayBasic: 'Stay on Basic',
    },
  },
  fr: {
    nav: {
      productores: 'Producteurs',
      distribuidores: 'Distributeurs',
      precios: 'Tarifs',
      logIn: 'Connexion',
      startFree: 'Commencer',
      goDashboard: 'Mon tableau de bord',
    },
    hero: {
      tag: '// AI-native operating system',
      headlineLine1: 'Every bottle tells a story.',
      headlineLine2: 'We track the proof.',
      subtitleLine1: 'PROOF n\'est pas un ERP.',
      subtitleLine2: 'C\'est la mémoire opérationnelle de votre production.',
      subtitleHighlight: 'mémoire opérationnelle',
      body: 'Téléchargez tout document, photo ou note. PROOF extrait, connecte et rend votre opération intelligente.',
      ctaDemo: 'Voir la démo',
      ctaStart: 'Commencer',
      mockup: {
        userLabel: 'Aldo · Vigneron',
        liveLabel: 'En direct',
        alerts: [
          {
            tone: 'warn',
            title: 'Fermentation hors plage',
            meta: 'LOT-2026-001 · Chardonnay',
          },
          {
            tone: 'info',
            title: '3 lots prêts à mettre en bouteille',
            meta: 'Viñas del Tigre · cette semaine',
          },
          {
            tone: 'ok',
            title: 'Réception confirmée',
            meta: 'BC-284 · 120 caisses',
          },
        ],
      },
    },
    contrast: {
      title: 'Les ERP enregistrent. PROOF comprend.',
      subtitle: 'Nous ne remplaçons pas votre comptabilité. Nous donnons une mémoire à votre opération liquide.',
      cards: [
        {
          title: 'Enregistrement vs. contexte',
          body: 'Un ERP stocke des chiffres. PROOF comprend que le lot 2026-001 est en malolactique et que le maître a décidé d\'attendre 48 heures de plus.',
        },
        {
          title: 'Formulaires vs. conversation',
          body: 'Dictez en cave, téléchargez une photo de ticket ou posez une question. PROOF structure l\'information sans interrompre votre flux.',
        },
        {
          title: 'Rapports vs. réponses',
          body: 'Pas de recherche dans dix écrans. Demandez « quels lots sont prêts ? » et obtenez la réponse avec le contexte complet.',
        },
      ],
    },
    productores: {
      eyebrow: 'Pour les producteurs',
      title: 'Une chronologie vivante pour chaque lot',
      subtitle: 'Vin, bière ou spiritueux — PROOF adapte protocoles, étapes et alertes à votre catégorie.',
    },
    distribuidores: {
      eyebrow: 'Pour les distributeurs',
      title: 'Inventaire, commandes et crédit en un seul endroit',
      subtitle: 'De la réception marchandise à l\'encaissement client.',
      bullets: [
        '📦 Réception intelligente — photographiez la palette et PROOF croise avec votre BC',
        '🛒 Prise de commandes avec stock en temps réel et règles de crédit',
        '💳 Portefeuille et recouvrement — solde par client, limites et alertes d\'échéance',
        '📊 KPIs opérationnels — rotation, marges et SKU critiques sans Excel',
      ],
    },
    upload: {
      eyebrow: 'Upload anything',
      title: 'Téléchargez ce que vous avez. PROOF comprend.',
      subtitle: 'Tickets, factures, bons de livraison, photos d\'étiquettes — tout format.',
      items: ['📸 Photo de ticket ou facture', '🎙️ Note vocale en cave', '📄 PDF ou Excel d\'inventaire', '💬 Question en langage naturel'],
    },
    pricing: {
      eyebrow: 'Tarifs',
      title: 'Des plans qui grandissent avec votre opération',
      plans: [
        {
          name: 'Basique',
          price: '0 €',
          period: '/mois',
          description: 'Pour commencer à donner une mémoire à votre opération.',
          features: ['Chronologie des lots', 'Saisie manuelle et chat', '1 utilisateur', 'Historique 90 jours'],
          cta: 'Commencer',
        },
        {
          name: 'Pro',
          price: '29 €',
          period: '/mois',
          description: 'Pour les équipes en temps réel.',
          features: ['Agent vocal', 'Photo intelligente', 'Sous-utilisateurs illimités', 'Alertes et protocoles', 'Historique complet'],
          cta: 'Commencer avec Pro',
          highlighted: true,
        },
        {
          name: 'Enterprise',
          price: 'Sur mesure',
          period: '',
          description: 'Pour les groupes multi-sites et intégrations.',
          features: ['Multi-site', 'API et intégrations', 'SLA dédié', 'Onboarding personnalisé'],
          cta: 'Contact',
        },
      ],
    },
    finalCta: {
      title: 'Donnez une mémoire à votre opération.',
      subtitle: 'Every bottle tells a story. We track the proof.',
      inputPlaceholder: 'vous@email.com',
      cta: 'Commencer',
    },
    footer: {
      tagline: 'Mémoire opérationnelle pour la production liquide.',
      product: 'Produit',
      company: 'Entreprise',
      legal: 'Mentions légales',
      copyright: '© 2026 PROOF. Tous droits réservés.',
    },
    upgradeModal: {
      title: 'Cette fonction fait partie du plan Pro',
      body: 'Agent vocal, photo intelligente et sous-utilisateurs inclus dès 29 €/mois.',
      seePlans: 'Voir les plans',
      stayBasic: 'Rester en Basique',
    },
  },
  it: {
    nav: {
      productores: 'Produttori',
      distribuidores: 'Distributori',
      precios: 'Prezzi',
      logIn: 'Accedi',
      startFree: 'Inizia gratis',
      goDashboard: 'Vai alla dashboard',
    },
    hero: {
      tag: '// AI-native operating system',
      headlineLine1: 'Every bottle tells a story.',
      headlineLine2: 'We track the proof.',
      subtitleLine1: 'PROOF non è un ERP.',
      subtitleLine2: 'È la memoria operativa della tua produzione.',
      subtitleHighlight: 'memoria operativa',
      body: 'Carica qualsiasi documento, foto o nota. PROOF estrae, collega e rende intelligente la tua operazione.',
      ctaDemo: 'Vedi demo',
      ctaStart: 'Inizia gratis',
      mockup: {
        userLabel: 'Aldo · Enologo',
        liveLabel: 'Live',
        alerts: [
          {
            tone: 'warn',
            title: 'Fermentazione fuori range',
            meta: 'LOT-2026-001 · Chardonnay',
          },
          {
            tone: 'info',
            title: '3 lotti pronti per imbottigliamento',
            meta: 'Viñas del Tigre · questa settimana',
          },
          {
            tone: 'ok',
            title: 'Ricezione confermata',
            meta: 'OC-284 · 120 casse',
          },
        ],
      },
    },
    contrast: {
      title: 'Gli ERP registrano. PROOF capisce.',
      subtitle: 'Non sostituiamo la contabilità. Diamo memoria alla tua operazione liquida.',
      cards: [
        {
          title: 'Registro vs. contesto',
          body: 'Un ERP memorizza numeri. PROOF capisce che il lotto 2026-001 è in malolattica e il maestro ha deciso di aspettare altre 48 ore.',
        },
        {
          title: 'Moduli vs. conversazione',
          body: 'Detta in cantina, carica una foto del ticket o chiedi in linguaggio naturale. PROOF struttura le informazioni senza interrompere il flusso.',
        },
        {
          title: 'Report vs. risposte',
          body: 'Niente ricerche in dieci schermate. Chiedi "quali lotti sono pronti?" e ottieni la risposta con il contesto completo.',
        },
      ],
    },
    productores: {
      eyebrow: 'Per i produttori',
      title: 'Una timeline viva per ogni lotto',
      subtitle: 'Vino, birra o distillato — PROOF adatta protocolli, fasi e alert alla tua categoria.',
    },
    distribuidores: {
      eyebrow: 'Per i distributori',
      title: 'Inventario, ordini e credito in un unico posto',
      subtitle: 'Dalla ricezione merce all\'incasso cliente.',
      bullets: [
        '📦 Ricezione intelligente — fotografa il pallet e PROOF incrocia con il tuo OC',
        '🛒 Presa ordini con stock in tempo reale e regole di credito',
        '💳 Portafoglio e incassi — saldo per cliente, limiti e alert scadenze',
        '📊 KPI operativi — rotazione, margini e SKU critici senza Excel',
      ],
    },
    upload: {
      eyebrow: 'Upload anything',
      title: 'Carica quello che hai. PROOF capisce.',
      subtitle: 'Ticket, fatture, DDT, foto etichette — qualsiasi formato.',
      items: ['📸 Foto ticket o fattura', '🎙️ Nota vocale in cantina', '📄 PDF o Excel inventario', '💬 Domanda in linguaggio naturale'],
    },
    pricing: {
      eyebrow: 'Prezzi',
      title: 'Piani che crescono con la tua operazione',
      plans: [
        {
          name: 'Base',
          price: '€0',
          period: '/mese',
          description: 'Per iniziare a dare memoria alla tua operazione.',
          features: ['Timeline lotti', 'Registro manuale e chat', '1 utente', 'Storico 90 giorni'],
          cta: 'Inizia gratis',
        },
        {
          name: 'Pro',
          price: '€29',
          period: '/mese',
          description: 'Per team che operano in tempo reale.',
          features: ['Agente vocale', 'Foto intelligente', 'Sub-utenti illimitati', 'Alert e protocolli', 'Storico completo'],
          cta: 'Inizia con Pro',
          highlighted: true,
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          period: '',
          description: 'Per gruppi multi-sede e integrazioni.',
          features: ['Multi-sede', 'API e integrazioni', 'SLA dedicato', 'Onboarding personalizzato'],
          cta: 'Contattaci',
        },
      ],
    },
    finalCta: {
      title: 'Dai memoria alla tua operazione.',
      subtitle: 'Every bottle tells a story. We track the proof.',
      inputPlaceholder: 'tua@email.com',
      cta: 'Inizia gratis',
    },
    footer: {
      tagline: 'Memoria operativa per la produzione liquida.',
      product: 'Prodotto',
      company: 'Azienda',
      legal: 'Legale',
      copyright: '© 2026 PROOF. Tutti i diritti riservati.',
    },
    upgradeModal: {
      title: 'Questa funzione fa parte del piano Pro',
      body: 'Agente vocale, foto intelligente e sub-utenti inclusi da €29/mese.',
      seePlans: 'Vedi piani',
      stayBasic: 'Resta su Base',
    },
  },
}

export function getLandingCopy(lang: LandingLang): LandingCopy {
  return COPY[lang]
}
