/**
 * PROOF · Cycle 1 · Step 7 — the dry run
 *
 * A harvest morning, harder than the transcript the pace harness uses, driven
 * through the app exactly as it stands. Nothing is fixed here. The point is to
 * find out where the event model and the way a winemaker talks come apart, and
 * to write that down.
 *
 * ── What this can and cannot measure ──────────────────────────────────────
 *
 * It cannot measure hesitation. A script does not hesitate, and reporting that
 * "the operator paused" would be invented data. So friction is recorded only
 * where it is structurally observable:
 *
 *   CLEAN      one obvious action, and everything said survives
 *   LOSSY      it records, but something the person said is dropped or
 *              distorted on the way in
 *   AMBIGUOUS  more than one action plausibly applies — this is *where* a
 *              person hesitates, even though the script cannot feel it
 *   DETOUR     the capability exists but there is no path to it, or one real
 *              event takes several operations
 *   BLOCKED    nothing in the product can represent what was said
 *
 * Each utterance carries the verdict I expected before running it, and the run
 * records what the app actually did. Where the two disagree the run says so,
 * so the write-up cannot quietly inherit my assumptions.
 *
 * And every deviation is paired with a claim about what the ledger therefore
 * does not know. Those claims are checked against the database afterwards, so
 * the findings are verifiable rather than an opinion about a screenshot.
 */

import { chromium } from 'playwright'
import postgres from 'postgres'

const BASE = process.env.PROOF_URL ?? 'http://localhost:3100'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ORG = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5433/proof_dev')

let taps = 0
let trips = 0
const log = []

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage()

const tap = async (s) => { taps++; await page.click(s, { timeout: 5000 }) }
const type = async (s, v) => { taps++; await page.fill(s, String(v), { timeout: 5000 }) }
const pick = async (s, v) => { taps++; await page.selectOption(s, String(v), { timeout: 5000 }) }
const go = async (url) => { trips++; await page.goto(url, { waitUntil: 'networkidle' }) }

/** Which things this screen currently lets you say. */
const offered = () => page.$$eval('[data-sheet]', (b) => b.map((n) => n.dataset.sheet))

/**
 * Opening a sheet that is not on offer is a finding, not a test failure, so it
 * has to be told apart from a mistyped selector — hence the explicit list.
 *
 * The button is a toggle and recording does not close the sheet, so tapping it
 * again after a save would shut it. Whether that is right is a question for
 * the write-up; here it only has to be handled.
 */
const open = async (key) => {
  const keys = await offered()
  if (!keys.includes(key)) {
    throw new Error(`no "${key}" action on this screen — only ${keys.join(', ') || 'nothing'}`)
  }
  const already = await page.$eval(`[data-sheet="${key}"]`, (b) => b.classList.contains('on'))
  if (!already) await tap(`[data-sheet="${key}"]`)
}

/**
 * Waits for the app to agree that something was recorded. A refusal is a real
 * outcome, so it is reported in the app's own words rather than surfacing as a
 * timeout with nothing in it.
 */
const settle = async (phrase) => {
  const outcome = await page
    .waitForFunction(
      (t) => {
        const err = document.querySelector('.err')
        if (err) return { err: err.textContent.trim() }
        return document.body.innerText.includes(t) ? { ok: true } : false
      },
      phrase,
      { timeout: 12000 },
    )
    .then((h) => h.jsonValue())
    .catch(() => ({ err: `nothing came back within 12s — "${phrase}" never appeared` }))
  if (outcome.err) throw new Error(outcome.err)
}

/**
 * @param text     what the winemaker said
 * @param expected the verdict I predicted before the run
 * @param lost     what the ledger will therefore not know
 * @param work     the closest thing the app lets you do, returning what happened
 */
async function said(text, expected, lost, work) {
  const t0 = taps
  const n0 = trips
  let observed = null
  let refusal = null
  try {
    observed = await work()
  } catch (e) {
    refusal = e.message
  }
  const entry = { text, expected, lost, observed, refusal, taps: taps - t0, trips: trips - n0 }
  log.push(entry)

  const mark = { CLEAN: '·', LOSSY: '~', AMBIGUOUS: '?', DETOUR: '>', BLOCKED: '×' }[expected]
  console.log(`  ${mark} ${expected.padEnd(9)} ${String(taps - t0).padStart(2)} taps  ${text}`)
  if (observed) console.log(`              app did:  ${observed}`)
  if (refusal) console.log(`              app said: ${refusal}`)
  if (lost) console.log(`              lost:     ${lost}`)
}

console.log('\nPROOF · dry run · a morning at Viñas del Tigre\n')

/* ---------------------------------------------------------------- 1. arrival */

await go(BASE)

await said(
  '“Two loads of Cabernet came in this morning from La Cañada, about a tonne and a half each.”',
  'DETOUR',
  'that they arrived together — two receptions with nothing joining them',
  async () => {
    let leftover = null
    for (const [n, code] of [[1, 'CS-26-D1'], [2, 'CS-26-D2']]) {
      await open('receive')
      if (n === 2) leftover = await page.inputValue('[data-f="lot_code"]')
      await type('[data-f="quantity"]', '1.5')
      await pick('[data-f="unit"]', 't')
      await type('[data-f="variety"]', 'Cabernet Sauvignon')
      await type('[data-f="source"]', 'La Cañada')
      await type('input[name="vessel_code"]', `BIN-${n}`)
      await type('[data-f="lot_code"]', code)
      await tap('button.primary')
      await settle(code)
    }
    return `one sentence recorded as two receptions; after the first the sheet stayed open still reading “${leftover}”`
  },
)

/* ------------------------------------------------------------------- 2. rot */

await go(`${BASE}/lots/CS-26-D2`)

await said(
  '“The second load had some rot in it. We threw maybe eighty kilos on the floor.”',
  'BLOCKED',
  'that fruit was thrown away — filed as a mismeasurement instead of a loss',
  async () => {
    const keys = await offered()
    // There is no "we lost some". The nearest thing on the screen says the
    // number was wrong, which files a resolution.
    await open('correct')
    await type('[data-f="observed"]', '1420')
    await type('[data-f="note"]', 'Threw about 80 kg of rotten fruit on the floor')
    await tap('button.primary')
    await settle('1,420')
    return `no loss action on offer (${keys.join(', ')}); recorded as “that number is wrong”`
  },
)

/* ------------------------------------------------------------- 3. co-ferment */

await said(
  '“We crushed both loads together into Tank 4 — they co-ferment.”',
  'BLOCKED',
  'the first load entirely: its lineage, and the 1,500 kg still sitting in BIN-1',
  async () => {
    await open('process')
    await type('[data-f="quantity"]', '1050')
    await type('input[name="output_vessel_code"]', 'TK-4')
    await type('[data-f="output_lot_code"]', 'CO-26-D')
    await type('[data-f="note"]', 'Co-fermented with CS-26-D1 — both loads went in together')
    await tap('button.primary')
    await settle('Processed')
    return 'pressing takes one input lot; the other load survives only as free text'
  },
)

/* --------------------------------------------------------------- 4. on skins */

await said(
  '“It is on skins, so I cannot tell you the volume yet.”',
  'BLOCKED',
  'nothing further — but the volume above had to be invented to get this far',
  async () => {
    // Do what was actually said: try to press without giving a volume. The
    // sheet is opened on the wine that now exists, since the fruit it was said
    // about has already been consumed by the pressing above.
    await go(`${BASE}/lots/CO-26-D`)
    await open('process')
    const box = await page.$eval('[data-f="quantity"]', (el) => ({
      required: el.required,
      message: el.validationMessage,
    }))
    await tap('button.primary')
    const stillOnTheSheet = (await page.$('[data-f="quantity"]')) !== null
    return box.required && stillOnTheSheet
      ? `the volume box is required — the browser refuses the submit with “${box.message}”`
      : 'the sheet accepted a pressing with no volume'
  },
)

/* ------------------------------------------------------------------- 5. SO2 */

await go(`${BASE}/lots/CO-26-D`)

await said(
  '“Added SO2, thirty grams per hectolitre.”',
  'BLOCKED',
  'the addition — no additive stock moves and no cost attaches to the wine',
  async () => {
    const keys = await offered()
    // Nothing consumes a material. A reading is the only place the words fit.
    await open('note')
    await type('[data-f="note"]', 'Added SO2 at 30 g/hL')
    await tap('button.primary')
    await settle('Added SO2')
    return `no addition action on offer (${keys.join(', ')}); recorded as a note on a reading`
  },
)

/* ------------------------------------------------------------ 6. pump-overs */

await said(
  '“Two pump-overs today, morning and evening.”',
  'AMBIGUOUS',
  'that there were two of them, and that they are work rather than a state',
  async () => {
    await open('stage')
    await type('[data-f="stage"]', 'remontado')
    await type('[data-f="note"]', 'Two pump-overs, morning and evening')
    await tap('button.primary')
    await settle('remontado')
    return '“something changed” and “took a reading” both fit; filed as a stage, which reads as a state the wine is in'
  },
)

/* ----------------------------------------------------------------- 7. Brix */

await said('“Brix is twenty-four.”', 'CLEAN', null, async () => {
  await open('note')
  await type('[data-f="brix"]', '24')
  await tap('button.primary')
  await settle('24')
  return 'one action, nothing dropped'
})

/* ------------------------------------------------------- 8. a fact about a tank */

await said(
  '“Tank 4 is the one with the cooling jacket. Tank 9 has not got one.”',
  'DETOUR',
  'that this is about the tank — it is filed against whatever wine is in it, and Tank 9 is never mentioned at all',
  async () => {
    await go(`${BASE}/tanks`)
    const onBoard = await offered()
    // The board can set a size and nothing else. A fact about a tank has to be
    // carried in on the back of a lot.
    await go(`${BASE}/lots/CO-26-D`)
    await open('note')
    await type('[data-f="note"]', 'Tank 4 has the cooling jacket; Tank 9 does not')
    await tap('button.primary')
    await settle('cooling jacket')
    return `the tank board offers ${onBoard.length ? onBoard.join(', ') : 'no capture actions'}; had to go back to a lot`
  },
)

/* ------------------------------------------------- 9. racking into two tanks */

await said(
  '“Racked it into Tank 7 and Tank 8, about half each.”',
  'BLOCKED',
  'worse than the second destination: the wine that went to Tank 8 is written down as lost',
  async () => {
    await open('move')
    const boxes = await page.$$eval('input[name="to_vessel_code"]', (n) => n.length)
    await type('[data-f="quantity_out"]', '1050')
    await type('[data-f="quantity_in"]', '525')
    await type('input[name="to_vessel_code"]', 'TK-7')
    await tap('button.primary')
    await settle('Moved')
    return `capture_transfer accepts several destinations; the sheet shows ${boxes}`
  },
)

/* -------------------------------------------------------- 10. the wrong date */

await said(
  '“Actually that racking was yesterday, not this morning.”',
  'BLOCKED',
  'the correct date — the entry stays wrong and nothing records that it is',
  async () => {
    await go(`${BASE}/lots/CO-26-D`)
    const controls = await page.$$eval('article.entry button, article.entry a[href*="edit"]', (n) => n.length)
    const keys = await offered()
    return `no way in: ${controls} controls on any recorded entry; the sheets on offer are ${keys.join(', ')}, and “that number is wrong” only takes a quantity`
  },
)

/* --------------------------------------------------------- 11–12. reading back */

await said(
  '“How much room have I got for tomorrow\'s pick?”',
  'CLEAN',
  'nothing on the way in — but read what comes back',
  async () => {
    await go(`${BASE}/tanks`)
    await page.waitForSelector('.board', { timeout: 5000 })
    const head = (await page.innerText('.lot-head')).replace(/\s+/g, ' ').trim()
    const free = Number((head.match(/([\d,]+) L\b/) ?? [])[1]?.replace(/,/g, '') ?? NaN)
    const biggest = Number((head.match(/biggest ([\d,]+) L/) ?? [])[1]?.replace(/,/g, '') ?? NaN)
    const incoherent = biggest > free ? '  ← the biggest single space is larger than the total' : ''
    return `${head.slice(0, 140)}${incoherent}`
  },
)

await said('“What happened to that Cabernet?”', 'CLEAN', null, async () => {
  await go(`${BASE}/lots/CO-26-D`)
  await page.waitForSelector('article.entry', { timeout: 5000 })
  const n = await page.$$eval('article.entry', (e) => e.length)
  return `${n} entries, read back without asking anything`
})

/* ------------------------------------------------------------ what is missing */

console.log('\n  Verifying what the ledger ended up not knowing…\n')

const checks = []
const check = async (claim, query, expected) => {
  const rows = await sql.unsafe(query)
  const got = String(rows[0]?.n ?? rows.length)
  checks.push({ claim, got, expected: String(expected), ok: got === String(expected) })
}

await check(
  'nothing joins the two loads that arrived together',
  `select count(distinct e.id)::text as n
     from public.events e
     join public.ledger_lines l on l.event_id = e.id
     join public.lots lo on lo.id = l.lot_id
    where e.kind = 'receipt' and lo.code in ('CS-26-D1', 'CS-26-D2')
      and e.protocol_run_step_id is null and e.corrects_event_id is null`,
  2,
)

await check(
  'fruit thrown on the floor is filed as a measurement, not a loss',
  `select count(*)::text as n from public.ledger_lines l
     join public.lots lo on lo.id = l.lot_id
    where lo.code = 'CS-26-D2' and l.reason in ('incident_loss', 'waste')`,
  0,
)

await check(
  'the co-ferment traces back to only one of the two loads',
  `select count(*)::text as n from public.lot_ancestry a
     join public.lots child on child.id = a.lot_id
     join public.lots anc on anc.id = a.ancestor_lot_id
    where child.code = 'CO-26-D' and anc.code like 'CS-26-D%'`,
  1,
)

await check(
  'the first load is still sitting in a bin the ledger thinks is full',
  `select round(sum(l.quantity * u.to_base), 0)::text as n
     from public.ledger_lines l
     join public.units u on u.code = l.unit_code
     join public.lots lo on lo.id = l.lot_id
    where lo.code = 'CS-26-D1'`,
  1500,
)

await check(
  'no SO2 exists as a material, and nothing was consumed',
  `select (
     (select count(*) from public.materials
       where organization_id = '${ORG}' and key ilike '%so2%')
     + (select count(*) from public.ledger_lines
         where organization_id = '${ORG}' and reason = 'consumption')
   )::text as n`,
  0,
)

await check(
  'the two pump-overs are one stage entry with no count',
  `select count(*)::text as n from public.events
    where organization_id = '${ORG}' and kind = 'stage' and note ilike '%pump-over%'`,
  1,
)

await check(
  'only one destination was recorded for a racking into two tanks',
  `select count(distinct l.vessel_id)::text as n from public.ledger_lines l
     join public.events e on e.id = l.event_id
     join public.lots lo on lo.id = l.lot_id
    where lo.code = 'CO-26-D' and e.kind = 'transfer' and l.quantity > 0`,
  1,
)

await check(
  'and the wine that went to the second tank is recorded as lost',
  `select round(-sum(l.quantity), 0)::text as n from public.ledger_lines l
     join public.events e on e.id = l.event_id
     join public.lots lo on lo.id = l.lot_id
    where lo.code = 'CO-26-D' and e.kind = 'transfer' and l.reason = 'expected_loss'`,
  525,
)

await check(
  'that overflow makes a tank over-full, and the board nets it against the rest',
  `select count(*)::text as n from public.vessel_board
    where organization_id = '${ORG}' and status = 'over'`,
  1,
)

await check(
  'a fact about a tank is filed against a wine lot instead',
  `select count(*)::text as n from public.events
    where organization_id = '${ORG}' and note ilike '%cooling jacket%'
      and subject_vessel_id is null and subject_lot_id is not null`,
  1,
)

// The sharpest version of the morning: three of the things Aldo said have an
// event kind waiting for them in the ledger, and no operation that writes it.
await check(
  'blend, consume and loss exist in the ledger and nothing in the product can write them',
  `select count(*)::text as n from public.events
    where organization_id = '${ORG}' and kind in ('blend', 'consume', 'loss')`,
  0,
)

await check(
  'Tank 9, which was also talked about, does not exist',
  `select count(*)::text as n from public.vessels
    where organization_id = '${ORG}' and code = 'TK-9'`,
  0,
)

for (const c of checks) {
  console.log(`  ${c.ok ? '·' : '!'} ${c.claim}`)
  if (!c.ok) console.log(`      expected ${c.expected}, got ${c.got}`)
}

/* --------------------------------------------------------------------- tally */

const by = (v) => log.filter((l) => l.expected === v).length
console.log(
  `\n  ${log.length} things said · ${taps} taps · ${trips} screen changes\n` +
    `  clean ${by('CLEAN')} · lossy ${by('LOSSY')} · ambiguous ${by('AMBIGUOUS')} · ` +
    `detour ${by('DETOUR')} · blocked ${by('BLOCKED')}\n`,
)

await browser.close()
await sql.end()

// A refusal on an utterance I expected to go through means the write-up would
// have been wrong, so it stops the run rather than being folded into a total.
const surprises = log.filter((l) => l.refusal && l.expected === 'CLEAN')
const unverified = checks.filter((c) => !c.ok)

if (surprises.length) {
  console.error(`  ${surprises.length} utterance(s) failed that were expected to be clean\n`)
}
if (unverified.length) {
  console.error(`  ${unverified.length} claim(s) about missing data did not hold — recheck them\n`)
}
if (surprises.length || unverified.length) process.exit(1)

console.log('  Every gap claimed above is confirmed against the database.\n')
