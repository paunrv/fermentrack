'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { fetchBatches, type Batch } from '@/lib/supabase'

const CARD_COLORS = ['#FAC775','#9FE1CB','#F5C4B3','#B5D4F4','#C0DD97','#F4C0D1','#AFA9EC','#F0997B']
const BADGE_COLORS = ['#FAC775','#9FE1CB','#F5C4B3','#B5D4F4','#C0DD97','#F4C0D1']
const CARD_SYMBOLS = ['⬡','◆','▲','●','■','◎','⬟','★']

function StatusBadge({ status, day, index }: { status: string; day: number; index: number }) {
  const bg = BADGE_COLORS[(index + 3) % BADGE_COLORS.length]
  const dotColor =
    status === 'active' ? '#1D9E75' : status === 'warn' ? '#E24B4A' : '#888'
  const label =
    status === 'active' ? `Día ${day}` : status === 'warn' ? 'pH alerta' : 'Listo'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        border: '2px solid #111',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        background: bg,
        color: '#111',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          display: 'inline-block',
          flexShrink: 0,
          background: dotColor,
          border: '1px solid #111',
        }}
      />
      {label}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useUser()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBatches().then(setBatches).finally(() => setLoading(false))
  }, [])

  const active  = batches.filter(b => b.status !== 'idle')
  const alerts  = batches.filter(b => b.status === 'warn')
  const totalL  = active.reduce((s,b) => s + (b.volume||0), 0)
  const firstName = user?.firstName || 'Productor'
  const today = new Date().toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div style={{ fontFamily:"'Space Grotesk',sans-serif", background:'#fff', minHeight:'100vh', padding:'32px' }}>

      {/* Stats */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:36,fontWeight:800,letterSpacing:'-.04em',color:'#111',lineHeight:1.1,marginBottom:6 }}>
          Hola, {firstName}. {active.some(b=>b.type.includes('Cerveza')) ? '🍺' : '🍷'}
        </h1>
        <p style={{ fontSize:13,color:'#888',fontWeight:500 }}>
          {loading ? '...' : `${active.length} lotes activos · ${alerts.length} alerta${alerts.length!==1?'s':''} · ${today}`}
        </p>
      </div>

      {/* Metrics row */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:3,marginBottom:32 }}>
        {[
          { val: loading ? '—' : active.length,             lbl:'Activos',    bg:'#111',  valColor:'#FAC775', lblColor:'#888' },
          { val: loading ? '—' : totalL.toLocaleString(),   lbl:'Litros',     bg:'#fff',  valColor:'#111',    lblColor:'#888' },
          { val: loading ? '—' : alerts.length,             lbl:'Alertas',    bg: alerts.length ? '#FAC775' : '#fff', valColor:'#111', lblColor:'#555' },
          { val: '87%',                                      lbl:'Eficiencia', bg:'#fff',  valColor:'#111',    lblColor:'#888' },
        ].map(m => (
          <div key={m.lbl} style={{ border:'3px solid #111',padding:'14px 16px',background:m.bg }}>
            <div style={{ fontSize:30,fontWeight:800,letterSpacing:'-.04em',color:m.valColor,lineHeight:1 }}>{m.val}</div>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:m.lblColor,marginTop:4 }}>{m.lbl}</div>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ fontSize:10,fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#888',marginBottom:12,borderLeft:'3px solid #111',paddingLeft:8 }}>
        Mis productos
      </div>

      {/* Product grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3 }}>
        {loading ? (
          [0,1,2].map(i => (
            <div key={i} style={{ border:'3px solid #eee',minHeight:160,background:'#fafafa' }} />
          ))
        ) : (
          batches.map((b, i) => (
            <Link key={b.id} href={`/dashboard/lotes`} style={{ textDecoration:'none' }}>
              <div style={{
                border:'3px solid #111',
                padding:20,
                background: CARD_COLORS[i % CARD_COLORS.length],
                minHeight:160,
                display:'flex',flexDirection:'column',justifyContent:'space-between',
                cursor:'pointer',
                transition:'transform .1s',
                position:'relative',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform='translate(-2px,-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform='translate(0,0)')}>
                {/* Haring symbol */}
                <div style={{ position:'absolute',right:14,top:12,fontSize:26,opacity:.12,lineHeight:1 }}>
                  {CARD_SYMBOLS[i % CARD_SYMBOLS.length]}
                </div>
                <div>
                  <div style={{ fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#111',opacity:.5 }}>
                    {b.id}
                  </div>
                  <div style={{ fontSize:22,fontWeight:800,letterSpacing:'-.03em',color:'#111',lineHeight:1.15,marginTop:4,marginBottom:6 }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize:11,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'#111',opacity:.6 }}>
                    {b.type}
                  </div>
                </div>
                <StatusBadge status={b.status} day={b.day} index={i} />
              </div>
            </Link>
          ))
        )}

        {/* Add new */}
        <Link href="/dashboard/lotes" style={{ textDecoration:'none' }}>
          <div style={{
            border:'3px dashed #ccc',minHeight:160,background:'#fff',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,
            cursor:'pointer',transition:'.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#111'; e.currentTarget.style.background='#f9f9f9' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#ccc'; e.currentTarget.style.background='#fff' }}>
            <div style={{ fontSize:32,color:'#ccc',lineHeight:1 }}>+</div>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'#ccc' }}>Nuevo producto</div>
          </div>
        </Link>
      </div>

    </div>
  )
}
