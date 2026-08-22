import { currentSession } from '@/lib/session'
import { getBoard, type BoardVessel } from '@/lib/vessels'
import { formatQuantity } from '@/lib/format'
import { SizeForm } from './size-form'

export const dynamic = 'force-dynamic'

export default async function TankBoard() {
  const session = await currentSession()
  if (!session) {
    return (
      <main className="wrap">
        <p className="empty">No winery is open.</p>
      </main>
    )
  }

  const { ready, inUse, unknown, room } = await getBoard(session)

  return (
    <main className="wrap">
      <header className="lot-head">
        <span className="eyebrow">
          <a href="/" className="back">← cellar</a>
        </span>
        <h1>Where can it go</h1>

        {room.length === 0 ? (
          <p className="lot-sub">
            Nothing here has a size on record yet, so PROOF cannot say how much room there is.
          </p>
        ) : (
          <dl className="now">
            {room.map((r) => (
              <div key={r.unit}>
                <dt>free</dt>
                <dd data-free={r.unit}>{formatQuantity(r.free, r.unit)}</dd>
                {/*
                  Total free space does not tell you whether a harvest fits.
                  Five thousand litres spread over ten tanks will not take a
                  single lot, so the biggest single space is the number that
                  actually answers the question.
                */}
                <div className="sub">biggest {formatQuantity(r.largest, r.unit)}</div>
              </div>
            ))}
            <div>
              <dt>in use</dt>
              <dd className="word">
                {inUse.length} of {ready.length + inUse.length}
              </dd>
            </div>
          </dl>
        )}

        {/*
          Said plainly rather than folded into the totals. A vessel nobody has
          measured cannot contribute room, and pretending otherwise would make
          the headline figure a guess wearing a precise number.
        */}
        {unknown.length > 0 && (
          <p className="board-caveat">
            {unknown.length} {unknown.length === 1 ? 'vessel has' : 'vessels have'} no size on
            record, so {unknown.length === 1 ? 'it is' : 'they are'} not counted above.
          </p>
        )}
      </header>

      <section className="board">
        {ready.length > 0 && (
          <>
            <h2 className="board-group">Empty and ready</h2>
            {ready.map((v) => (
              <Vessel key={v.vessel_id} v={v} />
            ))}
          </>
        )}

        {inUse.length > 0 && (
          <>
            <h2 className="board-group">Holding wine</h2>
            {inUse.map((v) => (
              <Vessel key={v.vessel_id} v={v} />
            ))}
          </>
        )}

        {unknown.length > 0 && (
          <>
            <h2 className="board-group">Size not known</h2>
            {unknown.map((v) => (
              <Vessel key={v.vessel_id} v={v} />
            ))}
          </>
        )}

        {ready.length + inUse.length + unknown.length === 0 && (
          <p className="empty">No vessels yet. They appear as soon as you use one.</p>
        )}
      </section>
    </main>
  )
}

function Vessel({ v }: { v: BoardVessel }) {
  const fill = v.fill === null ? null : Math.min(1, Math.max(0, Number(v.fill)))
  const over = v.status === 'over'

  return (
    <article className={`vessel is-${v.status}`} data-vessel={v.code}>
      <div className="vessel-head">
        <span className="vessel-code">{v.code}</span>
        <span className="vessel-type">{v.vessel_type}</span>
        <span className="spacer" />
        {v.status === 'unknown_size' ? (
          <span className="vessel-room muted">size unknown</span>
        ) : (
          <span className={`vessel-room${over ? ' over' : ''}`}>
            {over
              ? `${formatQuantity(Number(v.occupied) - Number(v.capacity_base ?? 0), v.unit)} over`
              : `${formatQuantity(v.available, v.unit)} free`}
          </span>
        )}
      </div>

      {fill !== null && (
        <div className="gauge" aria-hidden="true">
          <div className={`gauge-fill${over ? ' over' : ''}`} style={{ width: `${fill * 100}%` }} />
        </div>
      )}

      {v.contents.length === 0 ? (
        <p className="vessel-empty">
          {v.status === 'unknown_size' ? 'Empty.' : `Empty · holds ${formatQuantity(v.capacity_base, v.unit)}`}
        </p>
      ) : (
        <ul className="vessel-contents">
          {v.contents.map((c) => (
            <li key={c.lot_code}>
              <a href={`/lots/${encodeURIComponent(c.lot_code)}`} className="vessel-lot">
                {c.lot_code}
              </a>
              <span className="vessel-qty">{formatQuantity(c.quantity, c.unit)}</span>
              {c.stage && <span className="vessel-stage">{c.stage}</span>}
              {c.confidence === 'estimated' && <span className="chip chip-estimated">estimated</span>}
            </li>
          ))}
        </ul>
      )}

      {v.status === 'unknown_size' && <SizeForm code={v.code} unit="L" />}
    </article>
  )
}
