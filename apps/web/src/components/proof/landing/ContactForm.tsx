'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  Select,
  Stack,
  Textarea,
} from '@fermentrack/ui'
import { LANDING } from './landing-theme'

const PRODUCER_TYPE_KEYS = ['winery', 'brewery', 'distillery', 'distributor', 'other'] as const

export function ContactForm() {
  const t = useTranslations('contact.form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [producerType, setProducerType] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          producer_type: producerType || null,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? t('errorDefault'))
      }

      setStatus('success')
      setName('')
      setEmail('')
      setMessage('')
      setProducerType('')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : t('errorUnexpected'))
    }
  }

  if (status === 'success') {
    return (
      <Card
        role="status"
        style={{
          borderColor: LANDING.brand,
          background: `color-mix(in srgb, ${LANDING.brand} 8%, ${LANDING.bg})`,
          textAlign: 'center',
        }}
      >
        <CardContent>
          <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: LANDING.text }}>
            {t('successTitle')}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: LANDING.textSecondary, lineHeight: 1.6 }}>
            {t('successBody')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <FormField label={t('name')} htmlFor="contact-name">
          <Input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
        </FormField>

        <FormField label={t('email')} htmlFor="contact-email">
          <Input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </FormField>

        <FormField label={t('message')} htmlFor="contact-message">
          <Textarea
            id="contact-message"
            required
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ minHeight: 120 }}
          />
        </FormField>

        <FormField
          label={
            <>
              {t('producerType')}{' '}
              <span style={{ fontWeight: 400, color: LANDING.textSecondary }}>{t('optional')}</span>
            </>
          }
          htmlFor="contact-producer-type"
        >
          <Select
            id="contact-producer-type"
            value={producerType}
            onChange={e => setProducerType(e.target.value)}
          >
            <option value="">{t('producerPlaceholder')}</option>
            {PRODUCER_TYPE_KEYS.map(key => (
              <option key={key} value={t(`types.${key}`)}>
                {t(`types.${key}`)}
              </option>
            ))}
          </Select>
        </FormField>

        {status === 'error' ? <Alert variant="error">{errorMessage}</Alert> : null}

        <Button type="submit" loading={status === 'submitting'} style={{ alignSelf: 'flex-start' }}>
          {status === 'submitting' ? t('submitting') : t('submit')}
        </Button>
      </Stack>
    </form>
  )
}
