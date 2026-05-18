'use client'

import { useEffect, useState } from 'react'
import { fetchBatches, fetchActivity, type Batch, type Activity } from '@/lib/supabase'

const MONTHLY = [3200,3800,3500,4200,3900,5100,4700,5600,5200,4800,5900,6200]
const MONTHS  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function StatusPill({ status, day }: { status: string; day: number }) {
  if (status === 'active') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0F6E5622] text-[#5DCAA5] border border-[#1D9E7540]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />Día {day}
    </span>
  )
  if (status === 'warn') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#BA751722] text-[#EF9F27] border border-[#EF9F2740]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF9F27]" />Alerta
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1e3326] text-[#6b8c78] border border-[#1e3326]">
      Listo
    </span>
  )
}

export default function DashboardPage() {
  const [batches, setBatches]   = useState<Batch[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([fetchBatches(), fetchActivity()])
      .then(([b, a]) => { setBatches(b); setActivity(a) })
      .finally(() => setLoading(false))
  }, [])

  const active  = batches.filter(b => b.status !== 'idle')
  const alerts  = batches.filter(b => b.status === 'warn')
  const totalL  = active.reduce((s, b) => s + (b.volume || 0), 0)
  const maxProd = Math.max(...MONTHLY)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-[#e8f0eb]">Dashboard</h1>
          <p className="text-sm text-[#6b8c78] mt-0.5">Vista general de producción</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1D9E7511] border border-[#1D9E7530] rounded-full text-xs text-[#5DCAA5]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
          Supabase conectado
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Lotes activos',         value: loading ? '—' : active.length,                  sub: 'cerveza + vino' },
          { label: 'Litros en fermentación',value: loading ? '—' : totalL.toLocaleString(),         sub: 'volumen total' },
          { label: 'Alertas activas',       value: loading ? '—' : alerts.length,                  sub: alerts.length ? 'pH fuera rango' : 'todo normal', warn: alerts.length > 0 },
          { label: 'Eficiencia promedio',   value: '87%',                                           sub: 'últimos 30 días' },
        ].map(m => (
          <div key={m.label} className="bg-[#16221b] border border-[#1e3326] rounded-xl p-4">
            <div className="text-[11px] text-[#6b8c78] uppercase tracking-wider mb-2">{m.label}</div>
            <div className={`text-3xl font-medium font-mono tracking-tight ${m.warn ? 'text-[#EF9F27]' : 'text-[#e8f0eb]'}`}>{m.value}</div>
            <div className="text-[11px] text-[#5DCAA5] mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Lotes + Activity */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Lotes */}
        <div className="bg-[#16221b] border border-[#0F6E56] rounded-xl p-5">
          <div className="text-sm font-medium text-[#e8f0eb] mb-4 flex items-center gap-2">
            <span className="text-[#6b8c78]">⚗</span> Lotes activos
          </div>
          {loading
            ? <p className="text-sm text-[#6b8c78]">Cargando...</p>
            : batches.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-[#1e3326] last:border-0">
                <span className="font-mono text-xs text-[#9FE1CB] w-16 shrink-0">{b.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{b.name}</div>
                  <div className="h-1 bg-[#1e3326] rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${b.progress}%`,
                        background: b.status === 'warn' ? '#EF9F27' : b.status === 'idle' ? '#6b8c78' : '#1D9E75'
                      }}
                    />
                  </div>
                </div>
                <StatusPill status={b.status} day={b.day} />
              </div>
            ))
          }
        </div>

        {/* Activity */}
        <div className="bg-[#16221b] border border-[#1e3326] rounded-xl p-5">
          <div className="text-sm font-medium text-[#e8f0eb] mb-4 flex items-center gap-2">
            <span className="text-[#6b8c78]">◈</span> Actividad reciente
          </div>
          {loading
            ? <p className="text-sm text-[#6b8c78]">Cargando...</p>
            : activity.map(a => (
              <div key={a.id} className="flex gap-3 py-2 border-b border-[#1e3326] last:border-0">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: a.color?.includes('amber') ? '#EF9F27' : a.color?.includes('muted') ? '#6b8c78' : '#1D9E75' }} />
                <div className="font-mono text-[11px] text-[#6b8c78] w-10 shrink-0 mt-0.5">{a.time_label}</div>
                <div>
                  <div className="text-xs text-[#e8f0eb]">{a.text}</div>
                  <div className="text-[11px] text-[#6b8c78]">{a.sub}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-[#16221b] border border-[#1e3326] rounded-xl p-5">
        <div className="text-sm font-medium text-[#e8f0eb] mb-4 flex items-center gap-2">
          <span className="text-[#6b8c78]">▦</span> Producción mensual (litros)
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {MONTHLY.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-opacity hover:opacity-100"
              style={{
                height: `${Math.round(v / maxProd * 100)}%`,
                background: i === 11 ? '#5DCAA5' : '#0F6E56',
                opacity: i === 11 ? 1 : 0.65,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {MONTHS.map((m, i) => (
            <span key={m} className={`text-[10px] flex-1 text-center uppercase tracking-wider ${i === 11 ? 'text-[#5DCAA5]' : 'text-[#6b8c78]'}`}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
