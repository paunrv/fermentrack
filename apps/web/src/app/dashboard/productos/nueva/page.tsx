'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  updateDistInventory,
  type ProductCategory,
} from '@/lib/supabase'



const CATEGORIES: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: 'cerveza', label: 'Cerveza', emoji: '🍺' },
  { value: 'vino', label: 'Vino', emoji: '🍷' },
  { value: 'destilado', label: 'Destilado', emoji: '🥃' },
]

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cerveza: '#FAC775',
  vino: '#9FE1CB',
  destilado: '#F5C4B3',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-0)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--hairline)',
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
}

const CameraIconLg = (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const BackIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const SparklesIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
)

interface ExtractedData {
  name?: string
  category?: string
  quantity_bottles?: number
  price_per_bottle?: number
  total_price?: number
  date?: string
  producer?: string
}

type AiField =
  | 'name'
  | 'category'
  | 'producer'
  | 'quantity_bottles'
  | 'price_per_bottle'
  | 'date'

function extractJSON(text: string): ExtractedData | null {
  if (!text) return null
  try {
    return JSON.parse(text) as ExtractedData
  } catch {
    /* try regex */
  }
  const m = text.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      return JSON.parse(m[0]) as ExtractedData
    } catch {
      /* fall through */
    }
  }
  return null
}

function tryParseDate(s: string): string | null {
  if (!s) return null
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  const m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    const day = m[1]
    const month = m[2]
    let year = m[3]
    if (!day || !month || !year) return null
    if (year.length === 2) year = (parseInt(year, 10) > 50 ? '19' : '20') + year
    const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const d2 = new Date(iso)
    if (!isNaN(d2.getTime())) return iso
  }
  return null
}

export default function NuevaProductoPage() {
  const router = useRouter()
  const { scope } = useProfile()
  const supabase = useSupabase()

  const [step, setStep] = useState<1 | 2>(1)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dots, setDots] = useState('')
  const [aiFields, setAiFields] = useState<Set<AiField>>(new Set())

  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('cerveza')
  const [producer, setProducer] = useState('')
  const [quantity, setQuantity] = useState('')
  const [pricePerBottle, setPricePerBottle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!analyzing) {
      setDots('')
      return
    }
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'))
    }, 350)
    return () => clearInterval(id)
  }, [analyzing])

  const qty = parseInt(quantity, 10) || 0
  const price = parseFloat(pricePerBottle) || 0
  const totalPrice = qty * price

  function applyExtracted(data: ExtractedData) {
    const fields = new Set<AiField>()

    if (typeof data.name === 'string' && data.name.trim()) {
      setName(data.name.trim())
      fields.add('name')
    }
    if (
      typeof data.category === 'string' &&
      ['cerveza', 'vino', 'destilado'].includes(data.category.toLowerCase())
    ) {
      setCategory(data.category.toLowerCase() as ProductCategory)
      fields.add('category')
    }
    if (typeof data.producer === 'string' && data.producer.trim()) {
      setProducer(data.producer.trim())
      fields.add('producer')
    }
    if (typeof data.quantity_bottles === 'number' && data.quantity_bottles > 0) {
      setQuantity(String(Math.round(data.quantity_bottles)))
      fields.add('quantity_bottles')
    }
    if (typeof data.price_per_bottle === 'number' && data.price_per_bottle > 0) {
      setPricePerBottle(String(data.price_per_bottle))
      fields.add('price_per_bottle')
    }
    if (typeof data.date === 'string' && data.date.trim()) {
      const iso = tryParseDate(data.date)
      if (iso) {
        setDate(iso)
        fields.add('date')
      }
    }
    setAiFields(fields)
  }

  function handleFile(file: File) {
    setPhoto(file)
    setAnalyzeError(null)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  async function analyzePhoto() {
    if (!photo || !photoPreview) return
    setAnalyzeError(
      'La lectura automática ahora es con tu agente externo (MCP) en el dashboard. Continúa con captura manual.'
    )
    goToManual()
  }

  function goToManual() {
    setAiFields(new Set())
    setStep(2)
  }

  async function handleSave() {
    if (!name.trim() || qty <= 0 || price <= 0) {
      alert('Completa nombre, cantidad y precio por botella antes de guardar.')
      return
    }
    setSaving(true)
    try {
      const bottlesPerCase = 12
      const cases_qty = Math.floor(qty / bottlesPerCase)
      const units_qty = qty % bottlesPerCase

      const { data: inserted, error: insertError } = await supabase
        .from('dist_products')
        .insert({
          name: name.trim(),
          category,
          producer: producer.trim() || null,
          origin: 'local',
          unit_type: 'botella',
          bottles_per_case: bottlesPerCase,
          cost_per_unit: price,
          price_regular: price,
          price_mayoreo: 0,
          price_especial: 0,
          currency: 'MXN',
          notes: null,
          user_id: scope?.user_id ?? null,
          profile_type_v2: scope?.profile_type_v2 ?? null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      const productId = inserted.id

      await supabase.from('dist_movements').insert({
        product_id: productId,
        movement_type: 'entrada',
        cases: cases_qty,
        loose_units: units_qty,
        movement_date: date,
        notes: 'Inventario inicial',
        user_id: scope?.user_id ?? null,
        profile_type_v2: scope?.profile_type_v2 ?? null,
      })

      await updateDistInventory(supabase, productId, cases_qty, units_qty, bottlesPerCase)

      router.push(`/dashboard/productos/${productId}`)
    } catch (err: any) {
      alert(`Error al guardar: ${err?.message || 'desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        fontFamily: 'var(--font-display)',
        padding: 32,
      }}
    >
      <style>{`
        @keyframes nuevaSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-0)',
            textDecoration: 'none',
            border: '1px solid var(--hairline)',
            background: '#fff',
            padding: '8px 12px',
          }}
        >
          {BackIcon}
          <span>Dashboard</span>
        </Link>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: 'var(--fg-0)',
              lineHeight: 1.1,
            }}
          >
            Nueva etiqueta
          </h1>
          <p style={{ fontSize: 12, color: '#888', fontWeight: 500, marginTop: 2 }}>
            Sube la remisión como evidencia o ingresa los datos manualmente. Para lectura automática, conecta tu agente en el dashboard.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, marginLeft: 0 }}>
        {[
          { n: 1, label: 'Foto' },
          { n: 2, label: 'Confirmar' },
        ].map(({ n, label }) => {
          const active = step === n
          return (
            <div
              key={n}
              style={{
                flex: 1,
                padding: '14px 16px',
                marginLeft: n === 2 ? -3 : 0,
                border: active ? '1px solid var(--hairline)' : '3px dashed #bbb',
                background: active ? 'var(--fg-0)' : '#fff',
                color: active ? '#fff' : '#888',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? '#fff' : 'transparent',
                  color: active ? 'var(--fg-0)' : '#888',
                  border: active ? '3px solid #fff' : '3px dashed #bbb',
                  fontSize: 11,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {n}
              </span>
              <span>{label}</span>
            </div>
          )
        })}
      </div>

      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
          {!photoPreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                width: '100%',
                minHeight: 320,
                border: `3px dashed ${dragOver ? 'var(--fg-0)' : 'var(--fg-0)'}`,
                background: dragOver ? '#fafafa' : '#fff',
                color: 'var(--fg-0)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                padding: 32,
                fontFamily: 'var(--font-display)',
                outline: 'none',
                transition: 'background .15s',
              }}
            >
              <div style={{ color: 'var(--fg-0)' }}>{CameraIconLg}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: '-.02em',
                  color: 'var(--fg-0)',
                  textAlign: 'center',
                }}
              >
                Sube la foto de tu nota o remisión
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#888',
                  textAlign: 'center',
                  maxWidth: 360,
                  lineHeight: 1.4,
                }}
              >
                Arrastra una imagen aquí o haz click para seleccionarla
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  padding: '6px 10px',
                  border: '1px solid var(--hairline)',
                  background: '#fff',
                  color: 'var(--fg-0)',
                }}
              >
                Seleccionar imagen
              </div>
            </button>
          ) : (
            <div
              style={{
                border: '1px solid var(--hairline)',
                background: '#fff',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div
                style={{
                  border: '1px solid var(--hairline)',
                  background: '#f4f4f4',
                  height: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Remisión"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid var(--hairline)',
                    background: '#fff',
                    color: 'var(--fg-0)',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Cambiar foto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null)
                    setPhotoPreview(null)
                  }}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid var(--hairline)',
                    background: '#F4C0D1',
                    color: 'var(--fg-0)',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Quitar
                </button>
              </div>
            </div>
          )}

          {analyzeError && (
            <div
              style={{
                border: '1px solid var(--hairline)',
                background: '#F4C0D1',
                padding: 14,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--fg-0)',
              }}
            >
              {analyzeError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={analyzePhoto}
              disabled={!photo || analyzing}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '14px 18px',
                border: '1px solid var(--hairline)',
                background: 'var(--fg-0)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: !photo || analyzing ? 'not-allowed' : 'pointer',
                opacity: !photo || analyzing ? 0.5 : 1,
                fontFamily: 'var(--font-display)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {analyzing ? (
                <>
                  <div
                    className="nueva-spinner"
                    style={{
                      width: 14,
                      height: 14,
                      border: '3px solid #fff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'nuevaSpin 1s linear infinite',
                    }}
                  />
                  <span>Analizando{dots}</span>
                </>
              ) : (
                <>
                  {SparklesIcon}
                  <span>Continuar manual</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={goToManual}
              disabled={analyzing}
              style={{
                padding: '14px 18px',
                border: '1px solid var(--hairline)',
                background: '#fff',
                color: 'var(--fg-0)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: analyzing ? 'not-allowed' : 'pointer',
                opacity: analyzing ? 0.5 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              Ingresar manualmente
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: photoPreview ? '180px 1fr' : '1fr',
            gap: 20,
            maxWidth: 880,
            alignItems: 'flex-start',
          }}
        >
          {photoPreview && (
            <div
              style={{
                border: '1px solid var(--hairline)',
                background: '#f4f4f4',
                width: 180,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'sticky',
                top: 16,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Remisión"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          <div
            style={{
              border: '1px solid var(--hairline)',
              padding: 24,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {aiFields.size > 0 && (
              <div
                style={{
                  padding: 10,
                  border: '1px solid var(--hairline)',
                  background: '#C0DD97',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-0)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {SparklesIcon}
                <span>
                  La IA pre-llenó {aiFields.size} campo{aiFields.size === 1 ? '' : 's'} —
                  revísalos antes de guardar.
                </span>
              </div>
            )}

            <FormField
              labelText="Nombre del producto"
              ai={aiFields.has('name')}
            >
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                placeholder="Nombre comercial"
                required
              />
            </FormField>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              <FormField
                labelText="Categoría"
                ai={aiFields.has('category')}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {CATEGORIES.map(({ value, label, emoji }, i) => {
                    const active = category === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(value)}
                        style={{
                          padding: '12px 6px',
                          marginLeft: i === 0 ? 0 : -3,
                          border: '1px solid var(--hairline)',
                          background: active ? 'var(--fg-0)' : CATEGORY_COLORS[value],
                          color: active ? '#fff' : 'var(--fg-0)',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-display)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{emoji}</span>
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </FormField>

              <FormField
                labelText="Productor"
                ai={aiFields.has('producer')}
              >
                <input
                  type="text"
                  value={producer}
                  onChange={e => setProducer(e.target.value)}
                  style={inputStyle}
                  placeholder="Casa productora / fabricante"
                />
              </FormField>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              <FormField
                labelText="Cantidad de botellas"
                ai={aiFields.has('quantity_bottles')}
              >
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  style={inputStyle}
                  placeholder="0"
                  required
                />
              </FormField>

              <FormField
                labelText="Precio por botella"
                ai={aiFields.has('price_per_bottle')}
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={pricePerBottle}
                  onChange={e => setPricePerBottle(e.target.value)}
                  style={inputStyle}
                  placeholder="0.00"
                  required
                />
              </FormField>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              <FormField labelText="Precio total (MXN)">
                <div
                  style={{
                    ...inputStyle,
                    background: 'var(--fg-0)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(totalPrice)}
                </div>
              </FormField>

              <FormField labelText="Fecha" ai={aiFields.has('date')}>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </FormField>
            </div>

            <div
              style={{
                marginTop: 8,
                padding: 12,
                background: '#fafafa',
                border: '1px solid var(--hairline)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--fg-0)',
                letterSpacing: '.04em',
              }}
            >
              <span style={{ opacity: 0.7 }}>Inventario inicial: </span>
              <strong>
                {Math.floor(qty / 12)} caja{Math.floor(qty / 12) === 1 ? '' : 's'} ·{' '}
                {qty % 12} sueltas
              </strong>
              <span style={{ opacity: 0.7 }}> (12 bot. por caja)</span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={saving}
                style={{
                  padding: '14px 18px',
                  border: '1px solid var(--hairline)',
                  background: '#fff',
                  color: 'var(--fg-0)',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim() || qty <= 0 || price <= 0}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  border: '1px solid var(--hairline)',
                  background: 'var(--fg-0)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {saving ? 'Guardando...' : 'Confirmar y guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({
  labelText,
  ai,
  children,
}: {
  labelText: string
  ai?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={labelStyle}>
        <span>{labelText}</span>
        {ai && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 6px',
              border: '1px solid var(--hairline)',
              background: '#C0DD97',
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'var(--fg-0)',
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            </svg>
            Extraído por IA
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
