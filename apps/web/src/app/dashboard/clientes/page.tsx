'use client'

import { useEffect, useState } from 'react'
import {
  fetchClients,
  createClient,
  type Client,
  type ClientType,
  type PriceTier,
} from '@/lib/supabase'

const font = "'Space Grotesk', sans-serif"

const TYPE_COLORS: Record<ClientType, string> = {
  restaurante: '#FAC775',
  bar: '#9FE1CB',
  tienda: '#F5C4B3',
  'sub-distribuidor': '#B5D4F4',
}

const TYPE_LABELS: Record<ClientType, string> = {
  restaurante: 'Restaurante',
  bar: 'Bar',
  tienda: 'Tienda',
  'sub-distribuidor': 'Sub-distribuidor',
}

const TIER_LABELS: Record<PriceTier, string> = {
  regular: 'Regular',
  mayoreo: 'Mayoreo',
  especial: 'Especial',
}

const TIER_BG: Record<PriceTier, string> = {
  regular: '#fff',
  mayoreo: '#C0DD97',
  especial: '#F4C0D1',
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#111',
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '3px solid #111',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: '#111',
  outline: 'none',
  fontFamily: font,
}

const CLIENT_TYPES: ClientType[] = ['restaurante', 'bar', 'tienda', 'sub-distribuidor']
const PRICE_TIERS: PriceTier[] = ['regular', 'mayoreo', 'especial']

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<ClientType>('restaurante')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [priceTier, setPriceTier] = useState<PriceTier>('regular')
  const [notes, setNotes] = useState('')

  async function load() {
    const data = await fetchClients()
    setClients(data)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setName('')
    setType('restaurante')
    setContactName('')
    setPhone('')
    setEmail('')
    setAddress('')
    setPriceTier('regular')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await createClient({
        name: name.trim(),
        type,
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        price_tier: priceTier,
        notes: notes.trim() || null,
      })
      resetForm()
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: font, background: '#fff', minHeight: '100vh', padding: 32 }}>
      <div
        style={{
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-.04em',
              color: '#111',
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            Clientes
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
            Cartera de restaurantes, bares, tiendas y sub-distribuidores
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '12px 20px',
            background: showForm ? '#fff' : '#111',
            color: showForm ? '#111' : '#fff',
            border: '3px solid #111',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: font,
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: '3px solid #111',
            padding: 24,
            marginBottom: 32,
            background: TYPE_COLORS[type],
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
            Nuevo cliente
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={input}
                placeholder="Razón social o nombre comercial"
                required
              />
            </div>
            <div>
              <label style={label}>Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ClientType)}
                style={input}
                required
              >
                {CLIENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Tier de precio</label>
              <select
                value={priceTier}
                onChange={e => setPriceTier(e.target.value as PriceTier)}
                style={input}
                required
              >
                {PRICE_TIERS.map(t => (
                  <option key={t} value={t}>
                    {TIER_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Nombre de contacto</label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                style={input}
                placeholder="Persona responsable"
              />
            </div>
            <div>
              <label style={label}>Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={input}
                placeholder="55 1234 5678"
              />
            </div>
            <div>
              <label style={label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={input}
                placeholder="contacto@cliente.com"
              />
            </div>
            <div>
              <label style={label}>Dirección</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={input}
                placeholder="Calle, colonia, ciudad"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Notas</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...input, minHeight: 70, resize: 'vertical' }}
                placeholder="Días de visita, preferencias, condiciones de pago..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              marginTop: 16,
              padding: '12px 20px',
              background: '#111',
              color: '#fff',
              border: '3px solid #111',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.5 : 1,
              fontFamily: font,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </form>
      )}

      <div>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : clients.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>
            Aún no hay clientes. Agrega el primero con el botón &quot;+ Nuevo cliente&quot;.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {clients.map(client => (
              <div
                key={client.id}
                style={{
                  border: '3px solid #111',
                  padding: 20,
                  background: TYPE_COLORS[client.type],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  minHeight: 200,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: '#111',
                      }}
                    >
                      {client.name}
                    </div>
                    {client.contact_name && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginTop: 4,
                          color: '#333',
                        }}
                      >
                        {client.contact_name}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      padding: '5px 8px',
                      border: '3px solid #111',
                      background: '#fff',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {TYPE_LABELS[client.type]}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {client.phone && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
                      <span style={{ opacity: 0.6 }}>TEL </span>
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#111',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ opacity: 0.6 }}>EMAIL </span>
                      {client.email}
                    </div>
                  )}
                  {client.address && (
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#333', lineHeight: 1.4 }}>
                      {client.address}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      padding: '6px 10px',
                      border: '3px solid #111',
                      background: TIER_BG[client.price_tier],
                      color: '#111',
                    }}
                  >
                    {TIER_LABELS[client.price_tier]}
                  </span>
                  {client.notes && (
                    <span
                      title={client.notes}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        textAlign: 'right',
                      }}
                    >
                      {client.notes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
