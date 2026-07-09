'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchBatches, type Batch } from '@/lib/supabase'
import { PageFrame, ContentCard } from '@fermentrack/ui'



const LABEL_W_MM = 101.6
const LABEL_H_MM = 152.4

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-0)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-card)',
  border: '1px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
}

function barcodeValue(batchId: string, boxNum: number): string {
  return `${batchId}-C${String(boxNum).padStart(3, '0')}`
}

function generateBarcodeDataUrl(value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    try {
      JsBarcode(canvas, value, {
        format: 'CODE128',
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 12,
        font: 'monospace',
        margin: 6,
        background: 'var(--surface-card)',
        lineColor: '#000000',
      })
      resolve(canvas.toDataURL('image/png'))
    } catch (err) {
      reject(err)
    }
  })
}

function todayLabel(): string {
  return new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface LabelData {
  productName: string
  typeLine: string
  batchId: string
  boxNum: number
  totalBoxes: number
  date: string
  bottlesPerBox: number
  barcodeValue: string
  notes: string
}

function drawLabelOnPdf(pdf: jsPDF, data: LabelData, barcodeImg: string) {
  const m = 8
  let y = m + 4

  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  const nameLines = pdf.splitTextToSize(data.productName, LABEL_W_MM - m * 2)
  pdf.text(nameLines, m, y)
  y += nameLines.length * 7 + 4

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(data.typeLine, m, y)
  y += 6

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(`LOTE ${data.batchId}`, m, y)
  y += 8

  pdf.setFontSize(14)
  pdf.text(`Caja ${data.boxNum} de ${data.totalBoxes}`, m, y)
  y += 10

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(data.date, m, y)
  y += 6
  pdf.text(`${data.bottlesPerBox} botellas por caja`, m, y)
  y += 6

  if (data.notes.trim()) {
    const noteLines = pdf.splitTextToSize(data.notes, LABEL_W_MM - m * 2)
    pdf.setFontSize(8)
    pdf.text(noteLines, m, y)
    y += noteLines.length * 4 + 4
  }

  const barcodeH = 28
  const barcodeY = LABEL_H_MM - m - barcodeH
  const barcodeW = LABEL_W_MM - m * 2
  pdf.addImage(barcodeImg, 'PNG', m, Math.max(y + 4, barcodeY - 4), barcodeW, barcodeH)
}

export default function EtiquetasPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [batchId, setBatchId] = useState('')
  const [totalBoxes, setTotalBoxes] = useState('40')
  const [bottlesPerBox, setBottlesPerBox] = useState('12')
  const [notes, setNotes] = useState('')
  const [previewBarcode, setPreviewBarcode] = useState<string | null>(null)
  const previewSvgRef = useRef<SVGSVGElement>(null)

  const selectedBatch = useMemo(
    () => batches.find(b => b.id === batchId),
    [batches, batchId]
  )

  const total = Math.max(1, parseInt(totalBoxes, 10) || 1)
  const bottles = Math.max(1, parseInt(bottlesPerBox, 10) || 12)
  const previewBarcodeVal = batchId ? barcodeValue(batchId, 1) : ''
  const dateStr = todayLabel()

  const previewData: LabelData | null = selectedBatch
    ? {
        productName: selectedBatch.name,
        typeLine: selectedBatch.type,
        batchId: selectedBatch.id,
        boxNum: 1,
        totalBoxes: total,
        date: dateStr,
        bottlesPerBox: bottles,
        barcodeValue: previewBarcodeVal,
        notes,
      }
    : null

  useEffect(() => {
    if (!scope) return
    fetchBatches(supabase, scope)
      .then(b => {
        setBatches(b)
        if (b.length && b[0]) setBatchId(b[0].id)
      })
      .finally(() => setLoading(false))
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  useEffect(() => {
    if (!previewBarcodeVal) {
      setPreviewBarcode(null)
      return
    }
    let cancelled = false
    generateBarcodeDataUrl(previewBarcodeVal).then(url => {
      if (!cancelled) setPreviewBarcode(url)
    })
    if (previewSvgRef.current) {
      try {
        JsBarcode(previewSvgRef.current, previewBarcodeVal, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          background: 'var(--surface-card)',
          lineColor: '#000000',
        })
      } catch {
        /* preview svg optional */
      }
    }
    return () => {
      cancelled = true
    }
  }, [previewBarcodeVal])

  async function handleGeneratePdf() {
    if (!selectedBatch || !batchId) return
    const count = Math.max(1, parseInt(totalBoxes, 10) || 1)
    setGenerating(true)
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [LABEL_W_MM, LABEL_H_MM],
      })

      for (let box = 1; box <= count; box++) {
        if (box > 1) pdf.addPage([LABEL_W_MM, LABEL_H_MM])
        const bcVal = barcodeValue(batchId, box)
        const img = await generateBarcodeDataUrl(bcVal)
        drawLabelOnPdf(
          pdf,
          {
            productName: selectedBatch.name,
            typeLine: selectedBatch.type,
            batchId: selectedBatch.id,
            boxNum: box,
            totalBoxes: count,
            date: dateStr,
            bottlesPerBox: bottles,
            barcodeValue: bcVal,
            notes,
          },
          img
        )
      }

      pdf.save(`etiquetas-${batchId}.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageFrame style={{ overflow: 'auto' }}>
      <ContentCard>
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-.04em',
            color: 'var(--fg-0)',
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          Etiquetas
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 500 }}>
          Generador de etiquetas Code128 para cajas (4×6″)
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <form
          onSubmit={e => e.preventDefault()}
          style={{
            border: '1px solid var(--hairline)',
            padding: 24,
            background: 'var(--surface-card)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Configuración
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Lote</label>
              <select
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
                style={inputStyle}
                disabled={loading}
              >
                <option value="">Seleccionar lote</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.id} — {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Total de cajas</label>
                <input
                  type="number"
                  min={1}
                  value={totalBoxes}
                  onChange={e => setTotalBoxes(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Botellas por caja</label>
                <input
                  type="number"
                  min={1}
                  value={bottlesPerBox}
                  onChange={e => setBottlesPerBox(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Lote exportación"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generating || !batchId || !selectedBatch}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '14px 20px',
              background: 'var(--fg-0)',
              color: 'var(--ink)',
              border: '1px solid var(--hairline)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating || !batchId ? 0.5 : 1,
              fontFamily: 'var(--font-display)',
            }}
          >
            {generating ? 'Generando PDF...' : 'Generar PDF'}
          </button>
        </form>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Preview 4×6
          </div>

          {previewData ? (
            <div
              style={{
                width: '100%',
                maxWidth: 280,
                aspectRatio: '4 / 6',
                border: '1px solid var(--hairline)',
                background: 'var(--surface-card)',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-display)',
                color: 'var(--fg-0)',
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                {previewData.productName}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                {previewData.typeLine}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                Lote {previewData.batchId}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                Caja 1 de {previewData.totalBoxes}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                {previewData.date}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {previewData.bottlesPerBox} botellas por caja
              </div>
              <div style={{ marginTop: 'auto', width: '100%' }}>
                {previewBarcode ? (
                  <img
                    src={previewBarcode}
                    alt={previewData.barcodeValue}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                ) : (
                  <svg ref={previewSvgRef} style={{ width: '100%' }} />
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '3px dashed #ccc',
                aspectRatio: '4 / 6',
                maxWidth: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--fg-3)',
                fontWeight: 600,
              }}
            >
              Selecciona un lote
            </div>
          )}
        </div>
      </div>
      </ContentCard>
    </PageFrame>
  )
}
