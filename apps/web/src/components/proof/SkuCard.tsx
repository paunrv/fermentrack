'use client'

import { useRef, useState, type ReactNode } from 'react'
import type { EstadoSku } from '@/lib/supabase/distribuidor'

export type SkuCardEstado = 'ok' | 'bajo' | 'sin_stock' | 'sobrevendido'

export type SkuCardDataItem = {
  label: string
  value: string
  tone?: string
}

const ESTADO_DOT: Record<SkuCardEstado, string> = {
  ok: '#4CAF7D',
  bajo: '#EF9F27',
  sin_stock: '#E24B4A',
  sobrevendido: '#E24B4A',
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

export function mapSkuEstadoToCard(estado: EstadoSku): SkuCardEstado {
  switch (estado) {
    case 'sobrevendido':
      return 'sobrevendido'
    case 'quiebre':
      return 'sin_stock'
    case 'bajo':
    case 'muerto':
      return 'bajo'
    case 'sano':
    case 'en_transito':
    case 'consignacion':
    default:
      return 'ok'
  }
}

function IconPhoto() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#DDD"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 8h.01" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 16l5-5c.928-.893 2.072-.893 3 0l5 5" />
      <path d="M14 14l1-1c.928-.893 2.072-.893 3 0l3 3" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 7h1a2 2 0 0 0 2-2 1 1 0 0 1 1-1h6a1 1 0 0 1 1 1 2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function IconAdjustments() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
      <path d="M6 4v4" />
      <path d="M6 12v8" />
      <path d="M10 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
      <path d="M12 4v10" />
      <path d="M12 18v2" />
      <path d="M16 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
      <path d="M18 4v1" />
      <path d="M18 9v11" />
    </svg>
  )
}

export function SkuCard({
  nombre,
  proveedorNombre,
  imagenUrl,
  estado,
  dataItems = [],
  selected = false,
  accent,
  uploading = false,
  configOpen = false,
  configPanel,
  onClick,
  onConfigClick,
  onImageSelect,
}: {
  nombre: string
  proveedorNombre: string
  imagenUrl?: string | null
  estado: SkuCardEstado
  dataItems?: SkuCardDataItem[]
  selected?: boolean
  accent: string
  uploading?: boolean
  configOpen?: boolean
  configPanel?: ReactNode
  onClick: () => void
  onConfigClick?: () => void
  onImageSelect?: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const hasImage = Boolean(imagenUrl?.trim())
  const pulse = estado === 'sin_stock' || estado === 'sobrevendido'
  const visibleItems = dataItems.slice(0, 3)

  return (
    <div
      className="sku-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      title={nombre}
      aria-label={`${nombre}, ${proveedorNombre}${selected ? ', seleccionado' : ''}`}
      style={{
        width: '100%',
        background: selected ? '#FAFAF8' : '#fff',
        border: selected ? '0.5px solid #1A1A1A' : '0.5px solid #E8E6E0',
        borderRadius: 12,
        padding: 0,
        cursor: 'pointer',
        transition:
          'border-color 0.15s ease, transform 0.15s ease, background 0.15s ease',
        position: 'relative',
        textAlign: 'left',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (selected) return
        e.currentTarget.style.borderColor = accent
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (selected) return
        e.currentTarget.style.borderColor = '#E8E6E0'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <style>{`
        @keyframes proof-sku-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .sku-card .sku-camera-btn {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .sku-card:hover .sku-camera-btn,
        .sku-card:focus-within .sku-camera-btn {
          opacity: 1;
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          aspectRatio: '1',
          overflow: 'hidden',
          background: hasImage ? '#E8E6E0' : '#F4F2EE',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: ESTADO_DOT[estado],
            animation: pulse ? 'proof-sku-pulse 2s ease-in-out infinite' : undefined,
            zIndex: 3,
          }}
        />

        {onConfigClick && (
          <button
            type="button"
            aria-label="Configurar datos del card"
            aria-expanded={configOpen}
            onClick={e => {
              e.stopPropagation()
              onConfigClick()
            }}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.85)',
              border: '0.5px solid #E8E6E0',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              padding: 0,
              zIndex: 3,
              opacity: 1,
            }}
          >
            <IconAdjustments />
          </button>
        )}

        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagenUrl!}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                padding: '20px 8px 8px',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nombre}
            </div>
          </>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 8px',
              gap: 6,
            }}
          >
            <IconPhoto />
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#1A1A1A',
                textAlign: 'center',
                lineHeight: 1.25,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                width: '100%',
              }}
            >
              {nombre}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#CCC',
                fontFamily: MONO,
              }}
            >
              + agregar imagen
            </div>
          </div>
        )}

        {onImageSelect && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onImageSelect(file)
              }}
            />
            <button
              type="button"
              className="sku-camera-btn"
              aria-label="Agregar o cambiar imagen"
              onClick={e => {
                e.stopPropagation()
                fileRef.current?.click()
              }}
              style={{
                position: 'absolute',
                right: 6,
                bottom: 6,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                border: 'none',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                cursor: uploading ? 'wait' : 'pointer',
                zIndex: 2,
                padding: 0,
              }}
            >
              {uploading ? (
                <span style={{ fontSize: 8, color: '#999' }}>…</span>
              ) : (
                <IconCamera />
              )}
            </button>
          </>
        )}
      </div>

      <div style={{ padding: '8px 10px 12px' }}>
        <div
          style={{
            fontSize: 10,
            color: '#AAA',
            fontFamily: MONO,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {proveedorNombre}
        </div>

        {visibleItems.length > 0 && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '0.5px solid #EEECEA',
            }}
          >
            {visibleItems.map((item, i) => (
              <div
                key={`${item.label}-${i}`}
                style={{
                  marginTop: i > 0 ? 6 : 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: '#CCC',
                    fontFamily: MONO,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: MONO,
                    color: item.tone ?? '#1A1A1A',
                    marginTop: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {configOpen && configPanel ? (
          <div onClick={e => e.stopPropagation()}>{configPanel}</div>
        ) : null}
      </div>
    </div>
  )
}
