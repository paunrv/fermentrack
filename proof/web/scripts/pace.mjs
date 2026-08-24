/**
 * PROOF · Cycle 1 · Step 5 — the pace harness
 *
 * Step 5's gate is not "do the forms work". It is:
 *
 *     Can Aldo describe the harvest out loud, at his own pace, and have it all
 *     in PROOF by the time he has finished talking?
 *
 * That is only a real bar if it is measured, so this drives the actual app in a
 * real browser through a transcript of things a winemaker says, and counts
 * every interaction it takes to record each one.
 *
 * The honest metric is interactions, not seconds. Wall-clock measures this
 * machine and this script's typing speed; the number of taps and fields
 * measures the design. Seconds are reported anyway, but nothing is asserted on
 * them.
 *
 * What this is: a ratchet. The budgets below are ones we set ourselves, so
 * passing does not prove the capture is fast enough for a person — only Aldo
 * can say that. What it does prove is that nobody can quietly add three
 * mandatory fields without the build noticing.
 */

import { chromium } from 'playwright'

const BASE = process.env.PROOF_URL ?? 'http://localhost:3100'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

let taps = 0
const results = []

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 } })
const page = await ctx.newPage()

page.on('pageerror', (e) => {
  console.error('  page error:', e.message)
})

/* ---- every interaction goes through here, so none can be missed ---- */
const tap = async (selector) => {
  taps++
  await page.click(selector)
}
const type = async (selector, value) => {
  taps++
  await page.fill(selector, String(value))
}
const choose = async (selector, value) => {
  taps++
  await page.selectOption(selector, String(value))
}

async function utterance(said, budget, work) {
  const before = taps
  const started = Date.now()
  await work()
  const used = taps - before
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const ok = used <= budget
  results.push({ said, used, budget, seconds, ok })
  console.log(
    `  ${ok ? '·' : '!'} ${String(used).padStart(2)} taps (budget ${budget})  ${seconds}s   ${said}`,
  )
}

/**
 * Wait for something that could only be on the page if the recording landed.
 *
 * The first version counted timeline entries, which let a failed transfer pass
 * because four entries already existed. Counting is not evidence — the specific
 * thing being recorded is. A sheet that refused is surfaced as a failure rather
 * than waited out.
 */
async function recorded(phrase) {
  const refusal = await page.$('.err')
  if (refusal) throw new Error(`refused: ${await refusal.innerText()}`)
  try {
    await page.waitForFunction((t) => document.body.innerText.includes(t), phrase, {
      timeout: 15000,
    })
  } catch (e) {
    const late = await page.$('.err')
    throw new Error(late ? `refused: ${await late.innerText()}` : `never appeared: ${phrase}`)
  }
}

console.log('\nPROOF · capture pace\n')

// ---------------------------------------------------------------------------
await page.goto(BASE, { waitUntil: 'networkidle' })

await utterance('“Tuesday we brought in about 2.4 tonnes of Cabernet from La Cañada.”', 9, async () => {
  await tap('[data-sheet="receive"]')
  await tap('[data-when="2 days ago"]')
  await type('[data-f="quantity"]', '2.4')
  await choose('[data-f="unit"]', 't')
  await type('[data-f="variety"]', 'Cabernet Sauvignon')
  await type('[data-f="source"]', 'La Cañada')
  await type('input[name="vessel_code"]', 'BIN-2')
  await type('[data-f="lot_code"]', 'CS-26-P')
  await tap('button.primary')
  await recorded('CS-26-P')
})

// ---------------------------------------------------------------------------
await page.goto(`${BASE}/lots/CS-26-P`, { waitUntil: 'networkidle' })

await utterance('“We crushed it the same day — about 1,700 litres, in Tank 9.”', 7, async () => {
  await tap('[data-sheet="process"]')
  await type('[data-f="quantity"]', '1700')
  await type('input[name="output_vessel_code"]', 'TK-9')
  await type('[data-f="output_lot_code"]', 'MST-26-P')
  await type('[data-f="byproduct"]', '600')
  await tap('button.primary')
  await recorded('Processed')
})

// ---------------------------------------------------------------------------
await page.goto(`${BASE}/lots/MST-26-P`, { waitUntil: 'networkidle' })

await utterance('“It started fermenting yesterday.”', 4, async () => {
  await tap('[data-sheet="stage"]')
  await tap('[data-when="yesterday"]')
  await type('[data-f="stage"]', 'inicio de fermentación')
  await tap('button.primary')
  await recorded('inicio de fermentación')
})

await utterance('“Brix is 23.4 this morning, twenty-six degrees.”', 5, async () => {
  await tap('[data-sheet="note"]')
  await type('[data-f="brix"]', '23.4')
  await type('[data-f="temp"]', '26')
  await tap('button.primary')
  await recorded('23.4')
})

await utterance('“We racked it to Tank 11 — 1,700 out, 1,660 in.”', 6, async () => {
  await tap('[data-sheet="move"]')
  await type('[data-f="quantity_in"]', '1660')
  await type('[data-f="to_vessel"]', 'TK-11')
  // The shortfall must appear on its own, before anything is submitted.
  await page.waitForSelector('[data-shortfall="40"]', { timeout: 5000 })
  // And it must be answered. Step 8 took the tick off "lees, normal": PROOF
  // does not decide that forty missing litres were lees rather than a tank
  // nobody mentioned. That deliberate extra tap is what F1 cost the common
  // case, and it is measured here rather than argued about.
  await tap('[data-reason="expected_loss"]')
  await tap('button.primary')
  await recorded('expected loss')
})

await utterance('“We dipped Tank 11 properly. It is 1,645.”', 5, async () => {
  await tap('[data-sheet="correct"]')
  await type('[data-f="observed"]', '1645')
  await type('[data-f="note"]', 'Dipped the tank with a stick')
  await tap('button.primary')
  await recorded('1,645')
})

/* ------------------------------------------------------------------ verdict */

console.log('')
const failed = results.filter((r) => !r.ok)
const total = results.reduce((n, r) => n + r.used, 0)
const budget = results.reduce((n, r) => n + r.budget, 0)
const seconds = results.reduce((n, r) => n + Number(r.seconds), 0).toFixed(1)

console.log(`  ${results.length} operations · ${total} taps (budget ${budget}) · ${seconds}s total`)

// The text on screen has to be right too — a fast form that records the wrong
// thing has failed the more important test.
//
// Reload before checking, so this reads what was actually stored rather than
// whatever the page happened to be showing mid-revalidation.
await page.reload({ waitUntil: 'networkidle' })
const body = await page.innerText('body')
const checks = [
  ['the corrected volume is what the tank holds', body.includes('1,645')],
  ['the racking shortfall was named, not absorbed', body.includes('expected loss')],
  ['his own words survived', body.includes('inicio de fermentación')],
  ['the fruit it came from is on the timeline', body.includes('CS-26-P')],
  ['the guess upstream still governs', body.includes('ESTIMATED') || body.includes('estimated')],
]
for (const [what, ok] of checks) console.log(`  ${ok ? '·' : '!'} ${what}`)

await browser.close()

const wrong = checks.filter(([, ok]) => !ok)
if (failed.length || wrong.length) {
  console.error(
    `\n  PACE FAILED — ${failed.length} over budget, ${wrong.length} recorded incorrectly\n`,
  )
  process.exit(1)
}
console.log('\n  Capture kept pace, and recorded the right thing.\n')
