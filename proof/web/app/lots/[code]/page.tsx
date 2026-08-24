import { notFound } from 'next/navigation'
import { currentSession } from '@/lib/session'
import { getLot, listVessels, type StoryEntry } from '@/lib/lots'
import { CaptureBar } from '../../capture'
import { formatQuantity, formatWhen, readings } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function LotTimeline({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const session = await currentSession()
  if (!session) return <main className="wrap"><p className="empty">No winery is open.</p></main>

  const [result, vessels] = await Promise.all([
    getLot(session, decodeURIComponent(code)),
    listVessels(session),
  ])
  if (!result) notFound()

  const { card, story } = result

  return (
    <main className="wrap">
      <header className="lot-head">
        <span className="eyebrow">
          <a href="/" className="back">← cellar</a>
        </span>
        <h1>{card.name ?? card.code}</h1>
        <p className="lot-sub">
          {[card.code, card.variety, card.source].filter(Boolean).join(' · ')}
        </p>

        <dl className="now">
          <div>
            <dt>now</dt>
            <dd>{formatQuantity(card.quantity, card.unit)}</dd>
          </div>
          <div>
            <dt>where</dt>
            {/*
              A lot can sit in more than one tank, so this says all of them.
              Naming only the biggest would make the header disagree with the
              board, which is the failure this step exists to remove.
            */}
            <dd className="word">
              {card.vessel_codes.length > 0 ? card.vessel_codes.join(' · ') : '—'}
            </dd>
          </div>
          <div>
            <dt>doing</dt>
            <dd className="word">{card.stage ?? 'not yet recorded'}</dd>
          </div>
          <div>
            <dt>how sure</dt>
            <dd className="word">
              <span className={`chip chip-${card.confidence ?? 'derived'}`}>
                {card.confidence ?? 'unknown'}
              </span>
            </dd>
          </div>
        </dl>

        {(card.came_from.length > 0 || card.became.length > 0) && (
          <div className="lineage">
            {card.came_from.length > 0 && (
              <span>
                Came from{' '}
                {card.came_from.map((p, i) => (
                  <span key={p.lot_code}>
                    {i > 0 && ', '}
                    <a href={`/lots/${encodeURIComponent(p.lot_code)}`}>{p.lot_code}</a>
                  </span>
                ))}
              </span>
            )}
            {card.became.length > 0 && (
              <span>
                Became{' '}
                {card.became.map((c, i) => (
                  <span key={c.lot_code}>
                    {i > 0 && ', '}
                    <a href={`/lots/${encodeURIComponent(c.lot_code)}`}>{c.lot_code}</a>
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
        {/*
          What is offered depends on what the lot is actually doing. An empty
          lot cannot be moved or pressed, so it is not asked about — the list of
          things you can record is itself derived from the ledger.
        */}
        <CaptureBar
          lot={{
            code: card.code,
            unit: card.unit,
            quantity: card.quantity,
            vessel_code: card.vessel_code,
          }}
          vessels={vessels}
          offer={
            Number(card.quantity ?? 0) > 0
              ? ['move', 'note', 'stage', 'process', 'correct']
              : ['note', 'stage']
          }
        />
      </header>

      <section className="timeline">
        {story.map((entry) => (
          <Entry key={entry.event_id} entry={entry} subjectCode={card.code} />
        ))}
      </section>
    </main>
  )
}

function Entry({ entry, subjectCode }: { entry: StoryEntry; subjectCode: string }) {
  const { primary } = entry
  const when = formatWhen(entry.occurred_at)

  // Every row of this event belongs to a lot that is not yet the one being
  // read — so the whole moment happened before this wine had its name.
  const inherited = entry.rows.every((r) => r.is_inherited)

  const from = primary.from_vessel
  const to = primary.to_vessel
  const arrivals = primary.to_vessels ?? []
  const split = arrivals.length > 1
  const showVessels = from || to
  const movedBetween = from && to && from !== to

  // Changes are per lot, so every row contributes its own. Materials belong to
  // the event as a whole, so taking them from more than one row would list the
  // same pomace twice.
  const changes = entry.rows
    .flatMap((r) => r.changes)
    // Receipts and transformations are already the headline figure; repeating
    // them underneath just makes the card look like a ledger.
    .filter((c) => c.reason !== 'transformation' && c.reason !== 'receipt')
  const materials = primary.materials
  const reads = readings(primary.metadata)

  // A racking moves 1,700 L and loses 30. The net change is −30, so leading
  // with it would say "30 L" about an event that moved 1,700 — the amount that
  // travelled is what happened, and the shortfall is a detail beneath it.
  const moved = Math.max(
    0,
    ...entry.rows.map((r) => Math.min(Number(r.moved_in), Number(r.moved_out))),
  )
  const showFlow = moved > 0 || entry.outputs.length > 0

  const estimatedSource =
    primary.event_confidence === 'estimated' && entry.inputs.length > 0 && entry.outputs.length > 0

  return (
    <article className={`entry${inherited ? ' inherited' : ''}`}>
      <div className="when">
        <b>{when.date}</b>
        {when.time}
      </div>

      <div className="rail">
        <div className="card">
          <div className="card-head">
            <h2>{entry.headline}</h2>
            {inherited && (
              <span className="inherited-tag">as {primary.source_lot_code}</span>
            )}
          </div>

          {showFlow && moved > 0 && (
            <div className="flow">
              <span>{formatQuantity(moved, primary.unit)}</span>
              <span className="lot-tag">moved</span>
            </div>
          )}

          {showFlow && moved === 0 && (
            <div className="flow">
              {entry.inputs.map((r) => (
                <span key={`in-${r.source_lot_code}`} className="out">
                  {formatQuantity(Math.abs(Number(r.net_change)), r.unit)}
                  {r.source_lot_code !== subjectCode && (
                    <span className="lot-tag"> {r.source_lot_code}</span>
                  )}
                </span>
              ))}
              {entry.inputs.length > 0 && entry.outputs.length > 0 && (
                <span className="arrow">→</span>
              )}
              {entry.outputs.map((r) => (
                <span key={`out-${r.source_lot_code}`} className="in">
                  {formatQuantity(r.net_change, r.unit)}
                  {r.source_lot_code !== subjectCode && (
                    <span className="lot-tag"> {r.source_lot_code}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/*
            Where it went — all of it. A racking into two tanks used to read
            "TK-4 → TK-7" because the destination was picked by size, so the
            second tank was in the ledger and nowhere a person could see it.
          */}
          {showVessels && (
            <div className="vessels">
              {split ? (
                <>
                  {from && (
                    <>
                      {from}
                      <span className="arrow">→</span>
                    </>
                  )}
                  {arrivals.map((a, i) => (
                    <span className="arrival" key={a.code}>
                      {i > 0 && <span className="sep">·</span>}
                      {a.code}
                      <span className="arrival-qty">
                        {formatQuantity(a.quantity, a.unit)}
                      </span>
                    </span>
                  ))}
                </>
              ) : movedBetween ? (
                <>
                  {from}
                  <span className="arrow">→</span>
                  {to}
                </>
              ) : (
                to ?? from
              )}
            </div>
          )}

          {(changes.length > 0 || materials.length > 0) && (
            <div className="deltas">
              {changes
                .map((c, i) => (
                  <div className="delta" key={i}>
                    <span className={`q${Number(c.quantity) > 0 ? ' plus' : ''}`}>
                      {formatQuantity(Math.abs(Number(c.quantity)), c.unit)}
                    </span>{' '}
                    <span className="why">
                      {c.label}
                      {c.note ? ` — ${c.note}` : ''}
                    </span>
                  </div>
                ))}
              {materials.map((m, i) => (
                <div className="delta" key={`m-${i}`}>
                  <span className={`q${Number(m.quantity) > 0 ? ' plus' : ''}`}>
                    {formatQuantity(Math.abs(Number(m.quantity)), m.unit)}
                  </span>{' '}
                  <span className="why">
                    {m.material} {m.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {reads.length > 0 && (
            <div className="readings">
              {reads.map(([k, v]) => (
                <span key={k}>
                  <b>{k}</b> {v}
                </span>
              ))}
            </div>
          )}

          {primary.note && <p className="note">“{primary.note}”</p>}

          {estimatedSource && (
            <div className="flag">The quantity this came from was an estimate</div>
          )}

          {Number(primary.net_change) !== 0 && (
            <div className="after">
              left in {inherited ? primary.source_lot_code : 'this lot'}:{' '}
              <b>{formatQuantity(primary.balance_after, primary.unit)}</b>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
