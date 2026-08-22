import { currentSession } from '@/lib/session'
import { listLots, listVessels } from '@/lib/lots'
import { CaptureBar } from './capture'
import { formatQuantity, formatWhen } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function LotsPage() {
  const session = await currentSession()

  if (!session) {
    return (
      <main className="wrap">
        <p className="empty">No winery is open. Sign in to see what is happening.</p>
      </main>
    )
  }

  const [lots, vessels] = await Promise.all([listLots(session), listVessels(session)])

  return (
    <main className="wrap">
      <div className="lot-head">
        <span className="eyebrow">{session.organizationName}</span>
        <h1>What is in the cellar</h1>
        <CaptureBar vessels={vessels} offer={['receive']} />
      </div>

      {lots.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        <div className="lots">
          {lots.map((lot) => (
            <a
              className={`lot-row${Number(lot.quantity ?? 0) === 0 ? ' empty-lot' : ''}`}
              key={lot.lot_id}
              href={`/lots/${encodeURIComponent(lot.code)}`}
            >
              <div>
                <div className="code">{lot.code}</div>
                <div className="meta">
                  {[lot.name, lot.stage, lot.vessel_code ? `in ${lot.vessel_code}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  {lot.last_activity ? ` · ${formatWhen(lot.last_activity).relative}` : ''}
                </div>
              </div>
              <div className="qty">
                {formatQuantity(lot.quantity, lot.unit)}
                <small>{lot.confidence ?? ''}</small>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
