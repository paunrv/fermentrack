import { getTranslations } from 'next-intl/server'
import { LegalDraftBanner } from '@/components/proof/landing/LegalDraftBanner'
import { LANDING } from '@/components/proof/landing/landing-theme'

type LegalSection = {
  title: string
  intro?: string
  paragraphs: string[]
  isContact?: boolean
}

type LegalDocumentProps = {
  namespace: 'legal.privacy' | 'legal.terms'
}

export async function LegalDocument({ namespace }: LegalDocumentProps) {
  const t = await getTranslations(namespace)
  const tLegal = await getTranslations('legal')
  const sections = t.raw('sections') as LegalSection[]

  return (
    <section style={{ padding: '80px 24px 96px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: 'clamp(32px, 4vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: LANDING.text,
          }}
        >
          {t('title')}
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: LANDING.textSecondary }}>
          {tLegal('lastUpdatedLabel')} {t('lastUpdated')}
        </p>

        <LegalDraftBanner />

        {sections.map(section => (
          <article key={section.title} style={{ marginBottom: 40 }}>
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: LANDING.text,
              }}
            >
              {section.title}
            </h2>
            {section.intro ? (
              <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.7, color: LANDING.textSecondary }}>
                {section.intro}
              </p>
            ) : null}
            {section.paragraphs.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  margin: i < section.paragraphs.length - 1 ? '0 0 12px' : 0,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: LANDING.textSecondary,
                }}
              >
                {section.isContact ? (
                  <a
                    href={`mailto:${paragraph}`}
                    style={{ color: LANDING.brand, textDecoration: 'none' }}
                  >
                    {paragraph}
                  </a>
                ) : (
                  paragraph
                )}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}
