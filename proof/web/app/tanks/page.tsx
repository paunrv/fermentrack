import { currentSession } from '@/lib/session'
import { getBoard, type BoardVessel, type VesselContent } from '@/lib/vessels'
import { formatQuantity, formatWhen } from '@/lib/format'
import { SizeForm } from './size-form'
import { NextForm } from './next-form'

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
        <h1>The cellar today</h1>

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
        {inUse.length > 0 && (
          <>
            <h2 className="board-group">Holding wine</h2>
            {inUse.map((v) => (
              <Vessel key={v.vessel_id} v={v} />
            ))}
          </>
        )}

        {ready.length > 0 && (
          <>
            <h2 className="board-group">Empty</h2>
            {ready.map((v) => (
              <Vessel key={v.vessel_id} v={v} />
            ))}
          </>
        )}

        {unknown.length > 0 && (
          <>
            <h2 className="board-group">Empty · size not known</h2>
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

/**
 * One wine in one vessel, said the way he would say it.
 *
 * The quantity is shown in the unit he last used for this wine — he says "dos
 * punto cuatro toneladas", so the board does not answer him in kilograms — and
 * how well PROOF knows that number is always on screen, not only when it is a
 * guess. Then the two things a person standing in front of a tank actually
 * wants: what happened to it last, and what is supposed to happen next.
 */
function Contents({ c }: { c: VesselContent }) {
  const said = c.unit_said && c.quantity_said !== null && c.unit_said !== c.unit
  const when = c.last_at ? formatWhen(c.last_at) : null

  return (
    <li>
      <div className="vessel-line">
        <a href={`/lots/${encodeURIComponent(c.lot_code)}`} className="vessel-lot">
          {c.lot_code}
        </a>
        <span className="vessel-qty">
          {said
            ? formatQuantity(c.quantity_said, c.unit_said as string)
            : formatQuantity(c.quantity, c.unit)}
        </span>
        {/*
          Always shown, never only when it is bad news. "Measured" is a fact
          worth seeing next to a number, and a board that only labels the
          guesses makes silence look like certainty.
        */}
        <span className={`chip chip-${c.confidence ?? 'derived'}`}>{c.confidence ?? 'unknown'}</span>
        {c.stage && <span className="vessel-stage">{c.stage}</span>}
      </div>

      {(c.last_operation || c.next_action) && (
        <div className="vessel-status">
          {c.last_operation && (
            <span className="last">
              {c.last_operation.toLowerCase()}
              {when ? ` · ${when.relative}` : ''}
              {c.last_note ? ` · “${c.last_note}”` : ''}
            </span>
          )}
          {c.next_action && <span className="next">next · {c.next_action}</span>}
        </div>
      )}

      <NextForm lotCode={c.lot_code} current={c.next_action} />
    </li>
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
            <Contents key={c.lot_code} c={c} />
          ))}
        </ul>
      )}

      {v.status === 'unknown_size' && <SizeForm code={v.code} unit="L" />}
    </article>
  )
}
