/**
 * PROOF · Cycle 1 · Step 8 · F1 — the fidelity check
 *
 * The dry run's worst moment, run again through the real browser:
 *
 *     "Racked it into Tank 7 and Tank 8, about half each."
 *
 * Before F1 the sheet took one destination, so the shortfall rule gave the
 * unrepresented half a reason — 525 L of expected loss, stated as fact on the
 * lot's own timeline. Nobody typed it and nothing questioned it.
 *
 * This is not an SQL test. It goes the whole way a sentence actually travels:
 *
 *     spoken → browser → capture sheet → database → ledger → lot story → board
 *
 * and then asks the five surfaces the same question. They have to agree, and
 * they have to agree with what was said.
 *
 * It also measures what the capability cost, because a fidelity fix that made
 * the common racking slower would have traded one problem for another.
 */

import { chromium } from 'playwright'
import postgres from 'postgres'

const BASE = process.env.PROOF_URL ?? 'http://localhost:3100'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ORG = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5433/proof_dev')

let taps = 0
const cost = []
const checks = []

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage()

const tap = async (s) => { taps++; await page.click(s, { timeout: 5000 }) }
const type = async (s, v) => { taps++; await page.fill(s, String(v), { timeout: 5000 }) }
const pick = async (s, v) => { taps++; await page.selectOption(s, String(v), { timeout: 5000 }) }
const go = (url) => page.goto(url, { waitUntil: 'networkidle' })

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

/** Opens a sheet without closing one that recording left open. */
const open = async (key) => {
  const on = await page.$eval(`[data-sheet="${key}"]`, (b) => b.classList.contains('on'))
  if (!on) await tap(`[data-sheet="${key}"]`)
}

const measure = async (what, work) => {
  const before = taps
  await work()
  cost.push({ what, taps: taps - before })
}

const check = (claim, want, got) =>
  checks.push({ claim, want: String(want), got: String(got), ok: String(want) === String(got) })

const one = async (query) => (await sql.unsafe(query))[0]

console.log('\nPROOF · F1 · “Tank 7 and Tank 8, about half each”\n')

/* ------------------------------------------------- the wine that gets racked */

await go(BASE)
await tap('[data-sheet="receive"]')
await type('[data-f="quantity"]', '1500')
await pick('[data-f="unit"]', 'kg')
await type('[data-f="variety"]', 'Cabernet Sauvignon')
await type('input[name="vessel_code"]', 'BIN-9')
await type('[data-f="lot_code"]', 'F1-CS')
await tap('button.primary')
await settle('F1-CS')

await go(`${BASE}/lots/F1-CS`)
await open('process')
await type('[data-f="quantity"]', '1050')
await type('input[name="output_vessel_code"]', 'TK-4')
await type('[data-f="output_lot_code"]', 'F1-CO')
await tap('button.primary')
await settle('Processed')

taps = 0

/* ------------------------------------------------------------ the sentence */

await go(`${BASE}/lots/F1-CO`)

await measure('the racking that broke it: two tanks, half each', async () => {
  await open('move')
  await type('[data-f="quantity_in"]', '525')
  await type('[data-f="to_vessel"]', 'TK-7')
  await tap('[data-add-dest]')
  await type('[data-f="quantity_in_1"]', '525')
  await type('[data-f="to_vessel_1"]', 'TK-8')
  await tap('button.primary')
  await settle('Moved')
})

/* ---------------------------------------------- what the five surfaces say */

console.log('  What was said\n    “Racked it into Tank 7 and Tank 8, about half each.”\n')

// 1 · What was captured.
const captured = await one(`
  select count(distinct l.vessel_id)::text as n
  from public.ledger_lines l
  join public.events e on e.id = l.event_id
  join public.lots lo on lo.id = l.lot_id
  where lo.code = 'F1-CO' and e.kind = 'transfer' and l.reason = 'movement' and l.quantity > 0`)
check('captured · two destinations, not one', 2, captured.n)

// 2 · What the ledger says.
const loss = await one(`
  select coalesce(sum(l.quantity), 0)::text as n
  from public.ledger_lines l
  join public.events e on e.id = l.event_id
  join public.lots lo on lo.id = l.lot_id
  where lo.code = 'F1-CO' and e.kind = 'transfer' and l.reason <> 'movement'`)
check('ledger · no wine was lost, because none was', '0', loss.n)

const nets = await one(`
  select count(*)::text as n from (
    select sum(l.quantity * u.to_base) as net
    from public.ledger_lines l
    join public.units u on u.code = l.unit_code
    where l.organization_id = '${ORG}' and l.reason = 'movement'
    group by u.base_code having sum(l.quantity * u.to_base) <> 0) s`)
check('ledger · the movement legs still cancel', 0, nets.n)

const held = await one(`
  select string_agg(v.code || '=' || round(p.quantity, 0), ' ' order by v.code) as n
  from public.lot_vessel_positions p
  join public.vessels v on v.id = p.vessel_id
  join public.lots lo on lo.id = p.lot_id
  where lo.code = 'F1-CO' and p.quantity <> 0`)
check('ledger · half in each tank', 'TK-7=525 TK-8=525', held.n)

// 3 · What the lot timeline says.
await go(`${BASE}/lots/F1-CO`)
const story = (await page.innerText('main')).replace(/\s+/g, ' ')
check('timeline · names Tank 7', true, story.includes('TK-7'))
check('timeline · names Tank 8', true, story.includes('TK-8'))
check('timeline · says nothing was lost', false, /expected loss/i.test(story))
check('timeline · and the header says the wine is in both', true,
  /TK-7 · TK-8|TK-8 · TK-7/.test(story))

// 4 · What the tank board says.
await go(`${BASE}/tanks`)
const seven = await page.$eval('[data-vessel="TK-7"]', (n) => n.innerText.replace(/\s+/g, ' '))
const eight = await page.$eval('[data-vessel="TK-8"]', (n) => n.innerText.replace(/\s+/g, ' '))
check('board · Tank 7 holds 525 L of it', true, seven.includes('F1-CO') && seven.includes('525 L'))
check('board · Tank 8 holds 525 L of it', true, eight.includes('F1-CO') && eight.includes('525 L'))

/* ------------------------------------- the old failure, attempted on purpose */

await go(`${BASE}/lots/F1-CO`)
await open('move')
await type('[data-f="quantity_out"]', '525')
await type('[data-f="quantity_in"]', '260')
await type('[data-f="to_vessel"]', 'TK-7')
await page.waitForSelector('.shortfall', { timeout: 5000 })

const wording = (await page.innerText('.shortfall')).replace(/\s+/g, ' ')
check('the gap is stated in the operator’s units', true, /265 L still unaccounted for/.test(wording))
check('and nothing is pre-chosen for them', 0,
  await page.$$eval('[name="shortfall_reason"]', (r) => r.filter((x) => x.checked).length))

// The browser stops it, but the browser is not the guarantee. Strip the
// attribute that makes it stop and press again: the refusal has to come back
// from the database, or F1 is a form validation rather than a rule.
await page.$$eval('[name="shortfall_reason"]', (r) => r.forEach((x) => (x.required = false)))
await tap('button.primary')
await page.waitForSelector('.err', { timeout: 12000 }).catch(() => null)
const refusal = (await page.$('.err')) ? await page.$eval('.err', (n) => n.innerText.trim()) : ''
check('the server refuses an unexplained gap, not just the form', true,
  /unaccounted for/.test(refusal))
check('and it says so in words a person can act on', true,
  /which tank|what happened/.test(refusal))

const after = await one(`
  select count(*)::text as n from public.ledger_lines l
  join public.lots lo on lo.id = l.lot_id
  where lo.code = 'F1-CO' and l.reason in ('expected_loss', 'incident_loss', 'waste')`)
check('and nothing was written down while it was unexplained', 0, after.n)

/* ------------------------------------------------------ what it cost in taps */

// Each measurement gets its own wine in its own tank. Racking the same lot
// four times would measure a lot this script has already pulled apart, not the
// sheet.
for (const [code, tank] of [['F1-M1', 'TK-M1'], ['F1-M2', 'TK-M2'], ['F1-M3', 'TK-M3']]) {
  await go(BASE)
  await tap('[data-sheet="receive"]')
  await type('[data-f="quantity"]', '1050')
  await pick('[data-f="unit"]', 'L')
  await type('input[name="vessel_code"]', tank)
  await type('[data-f="lot_code"]', code)
  await tap('button.primary')
  await settle(code)
}

await go(`${BASE}/lots/F1-M1`)
taps = 0
await measure('a plain racking, one tank, nothing missing', async () => {
  await open('move')
  await type('[data-f="quantity_in"]', '1050')
  await type('[data-f="to_vessel"]', 'TK-12')
  await tap('button.primary')
  await settle('Moved')
})

await go(`${BASE}/lots/F1-M2`)
await measure('one tank, with wine genuinely missing', async () => {
  await open('move')
  await type('[data-f="quantity_in"]', '1020')
  await type('[data-f="to_vessel"]', 'TK-13')
  await tap('[data-reason="expected_loss"]')
  await tap('button.primary')
  await settle('Moved')
})

await go(`${BASE}/lots/F1-M3`)
await measure('three tanks', async () => {
  await open('move')
  await type('[data-f="quantity_in"]', '350')
  await type('[data-f="to_vessel"]', 'TK-14')
  await tap('[data-add-dest]')
  await type('[data-f="quantity_in_1"]', '350')
  await type('[data-f="to_vessel_1"]', 'TK-15')
  await tap('[data-add-dest]')
  await type('[data-f="quantity_in_2"]', '350')
  await type('[data-f="to_vessel_2"]', 'TK-16')
  await tap('button.primary')
  await settle('Moved')
})

// Nothing anywhere in the winery is in a tank it was never put in. A negative
// position would mean PROOF had recorded wine coming out of somewhere it never
// was — the same class of untruth F1 exists to remove, from the other side.
const negatives = await one(`
  select count(*)::text as n from public.lot_vessel_positions
  where organization_id = '${ORG}' and quantity < 0`)
check('nothing came out of a tank it was never in', 0, negatives.n)

/* --------------------------------------------------------------------- report */

for (const c of checks) {
  console.log(`  ${c.ok ? '·' : '!'} ${c.claim}`)
  if (!c.ok) console.log(`      wanted ${c.want}, got ${c.got}`)
}

console.log('\n  What it costs\n')
for (const c of cost) console.log(`    ${String(c.taps).padStart(2)} taps   ${c.what}`)
console.log('')

await browser.close()
await sql.end()

const failed = checks.filter((c) => !c.ok)
if (failed.length) {
  console.error(`  ${failed.length} of ${checks.length} disagreed — F1 is not fixed\n`)
  process.exit(1)
}
console.log(`  All ${checks.length} agree: what was said is what PROOF knows.\n`)
