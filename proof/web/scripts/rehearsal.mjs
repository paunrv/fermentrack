/**
 * PROOF · the rehearsal
 *
 * Aldo's own notebook — Colombard Pet Nat 2026, 10 to 28 August — captured the
 * way it will be captured at the winery: somebody reading it out while somebody
 * else types. Then the board is opened and printed, because the gate is not a
 * tap count or a passing assertion. It is whether he can look at the screen and
 * say "sí, así está mi bodega."
 *
 * A machine cannot say that. So this prints the board exactly as it renders and
 * stops there — the last step is a person reading it.
 *
 * What it *can* do is find the walls. Where the notebook says something the six
 * operations cannot express, the run records it rather than quietly skipping
 * it, so the list of what to build next comes from his vintage instead of from
 * a roadmap.
 */

import { chromium } from 'playwright'

const BASE = process.env.PROOF_URL ?? 'http://localhost:3101'
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

let taps = 0
const said = []
const walls = []

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage()

const tap = async (s) => { taps++; await page.click(s, { timeout: 5000 }) }
const type = async (s, v) => { taps++; await page.fill(s, String(v), { timeout: 5000 }) }
const pick = async (s, v) => { taps++; await page.selectOption(s, String(v), { timeout: 5000 }) }
const go = (u) => page.goto(u, { waitUntil: 'networkidle' })

const open = async (key) => {
  const on = await page.$eval(`[data-sheet="${key}"]`, (b) => b.classList.contains('on')).catch(() => null)
  if (on === null) throw new Error(`no "${key}" action on this screen`)
  if (!on) await tap(`[data-sheet="${key}"]`)
}

const settle = async (phrase) => {
  const out = await page
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
    .catch(() => ({ err: `"${phrase}" never appeared` }))
  if (out.err) throw new Error(out.err)
}

/** One line of the notebook, and whether PROOF could hold it. */
async function note(date, text, work) {
  const before = taps
  try {
    await work()
    said.push({ date, text, taps: taps - before, ok: true })
    console.log(`  · ${date.padEnd(6)} ${String(taps - before).padStart(2)} taps  ${text}`)
  } catch (e) {
    said.push({ date, text, taps: taps - before, ok: false, why: e.message })
    console.log(`  ! ${date.padEnd(6)} ${String(taps - before).padStart(2)} taps  ${text}`)
    console.log(`              PROOF said: ${e.message}`)
  }
}

/** Something in the notebook the six operations cannot express. */
const wall = (date, text, why) => {
  walls.push({ date, text, why })
  console.log(`  × ${date.padEnd(6)}  —      ${text}`)
  console.log(`              ${why}`)
}

console.log('\nPROOF · rehearsal · Colombard Pet Nat 2026, from Aldo\'s notebook\n')

/* ─────────────────────────────────────────────────── 10 August · la cosecha */

await go(BASE)

await note('10/8', '“Llegaron 35 cajas de Colombard de 16 a 17 kilos. Muy buena, mucha hoja.”', async () => {
  await open('receive')
  await type('[data-f="quantity"]', '35')
  await pick('[data-f="unit"]', 'box')
  await type('[data-f="variety"]', 'Colombard')
  await type('input[name="vessel_code"]', 'BIN-1')
  await type('[data-f="lot_code"]', 'COL-26')
  await type('[data-f="note"]', 'Semilla café, casi toda sana. Algunas picadas y quemadas. MUCHA HOJA. 20.5 Brix')
  await tap('button.primary')
  await settle('COL-26')
})

wall('10/8', '“SO₂: 2 g/hL, total 15 gr.”',
  'no operation adds anything to wine — the dose survives only as free text')

/* ──────────────────────────────────────── 10 August · molienda y dos prensas */

await go(`${BASE}/lots/COL-26`)

await note('10/8', '“Se molió y se prensó: de 480 litros de mosto salieron 320 de jugo.”', async () => {
  await open('process')
  await type('[data-f="quantity"]', '320')
  await type('input[name="output_vessel_code"]', 'TK-500')
  await type('[data-f="output_lot_code"]', 'PETNAT-26')
  await type('[data-f="note"]', '480 L de mosto, dos prensas: 130+30 escurrido y prensa suave, luego 120+40')
  await tap('button.primary')
  await settle('Processed')
})

wall('10/8', '“Prensa 1: 220 L. Prensa 2: 260 L. Escurrido y prensa suave por separado.”',
  'one pressing takes one input and gives one output, so two runs and four fractions become one number and a note')

/* ─────────────────────────────────────────────────── 12–24 August · la bodega */

await go(`${BASE}/lots/PETNAT-26`)

await note('12/8', '“Desfangado, de 8-9 grados, terminó en 11.5.”', async () => {
  await open('stage')
  await type('[data-f="stage"]', 'desfangado')
  await type('[data-f="note"]', '8-9 °C, terminado 11.5 °C. Tanque de 500 L con placa y máximo frío posible')
  await tap('button.primary')
  await settle('desfangado')
})

await note('22/8', '“Trasiego. Huele súper rico y sigue fermentando fuerte. 19.3 grados.”', async () => {
  await open('note')
  await type('[data-f="temp"]', '19.3')
  await type('[data-f="note"]', 'Trasiego. Huele súper rico y sigue fermentando fuerte')
  await tap('button.primary')
  await settle('19.3')
})

await note('24/8', '“Densidad 1.001. El trasiego le gustó mucho y se secó.”', async () => {
  await open('note')
  await type('[data-f="brix"]', '1.001')
  await type('[data-f="temp"]', '19')
  await type('[data-f="note"]', 'Densidad 1.001. El trasiego le gustó mucho y se secó. Habrá que agregar jugo')
  await tap('button.primary')
  await settle('1.001')
})

/* ─────────────────────────────────────────── 25 August · la segunda cosecha */

await go(BASE)

await note('25/8', '“Cosecha de Colombard, 117 kilos.”', async () => {
  await open('receive')
  await type('[data-f="quantity"]', '117')
  await pick('[data-f="unit"]', 'kg')
  await type('[data-f="variety"]', 'Colombard')
  await type('input[name="vessel_code"]', 'BIN-2')
  await type('[data-f="lot_code"]', 'COL-26-B')
  await tap('button.primary')
  await settle('COL-26-B')
})

await go(`${BASE}/lots/COL-26-B`)

await note('25/8', '“Se molió y se prensó: 64 litros. Al refri de la cocina.”', async () => {
  await open('process')
  await type('[data-f="quantity"]', '64')
  await type('input[name="output_vessel_code"]', 'REFRI')
  await type('[data-f="output_lot_code"]', 'JUGO-26')
  await tap('button.primary')
  await settle('Processed')
})

/* ────────────────────────────────────────────────── 27 August · el trasiego */

await go(`${BASE}/lots/PETNAT-26`)

await note('27/8', '“Trasiego. Densidad .994. Se quitaron 20 litros de lías.”', async () => {
  await open('move')
  await type('[data-f="quantity_out"]', '320')
  await type('[data-f="quantity_in"]', '300')
  await type('[data-f="to_vessel"]', 'TK-500')
  await tap('[data-reason="expected_loss"]')
  await type('[data-f="note"]', 'Trasiego. Se quitaron 20 L de lías. Densidad .994, 19 °C')
  await tap('button.primary')
  await settle('Moved')
})

wall('27/8', '“Se quitaron 20 litros de lías” — y él las guarda para destilar.',
  'the lees can only be recorded as a loss; that they left as a thing he keeps is not representable')

wall('27/8', '“Se agregaron 30 litros de jugo para lograr 1.008. Resultado: 1.006.”',
  'wine cannot be added to wine, and there is nowhere to say what the target was')

wall('27/8', '“Se quitó la placa de enfriamiento. Arrancó la fermentación.”',
  'the fermentation start fits as a stage; taking the cooling plate off is work performed, which has no home')

await note('28/8', '“Densidad 1.005, 20.5 grados. Ojo: densímetro calibrado a 15.57.”', async () => {
  await open('note')
  await type('[data-f="brix"]', '1.005')
  await type('[data-f="temp"]', '20.5')
  await type('[data-f="note"]', 'Densímetro calibrado a 15.57 °C; densidad real 1.006 más el CO₂ disuelto. Se usó la bombita de diafragma')
  await tap('button.primary')
  await settle('1.005')
})

wall('28/8', '“Se embotelló. 23 cajas menos 4 botellas, más otro formato.”',
  'there is no bottling operation — package exists in the ledger and nothing writes it')

/* ──────────────────────────────────────────── what comes next, said out loud */

await go(`${BASE}/tanks`)
await page.waitForSelector('.board', { timeout: 5000 })

await note('hoy', '“A ese hay que revisarle la densidad mañana temprano.”', async () => {
  // Scoped to the right tank. There is one of these per wine on the board, and
  // the first run typed into one and submitted another.
  await type('[data-next="PETNAT-26"]', 'Revisar densidad mañana temprano')
  taps++
  await page.locator('form.next-form', { has: page.locator('[data-next="PETNAT-26"]') })
    .locator('button')
    .click({ timeout: 5000 })
  await page.waitForFunction(
    () => document.body.innerText.includes('Revisar densidad mañana temprano'),
    { timeout: 12000 },
  )
})

/* ──────────────────────────────────────────────────────────── el tablero */

await go(`${BASE}/tanks`)
await page.waitForSelector('.board', { timeout: 5000 })

console.log('\n' + '─'.repeat(72))
console.log('  THE BOARD — this is the screen Aldo has to recognise')
console.log('─'.repeat(72) + '\n')
console.log(
  (await page.innerText('main'))
    .split('\n')
    .filter((l) => l.trim() && !/^(what is next\?|Note it|how big is it\?|litres|hL|kg|tonnes|Save)$/i.test(l.trim()))
    .map((l) => '  ' + l)
    .join('\n'),
)

console.log('\n' + '─'.repeat(72))
const kept = said.filter((s) => s.ok).length
console.log(
  `\n  ${kept} of ${said.length} notebook entries recorded · ${taps} taps\n` +
    `  ${walls.length} things in his own vintage PROOF cannot hold yet\n`,
)
for (const w of walls) console.log(`    ${w.date}  ${w.text}`)

const failed = said.filter((s) => !s.ok)
console.log('')
await browser.close()

if (failed.length) {
  console.error(`  ${failed.length} entr(ies) that should have recorded did not:\n`)
  for (const f of failed) console.error(`    ${f.date}  ${f.text}\n      ${f.why}`)
  process.exit(1)
}
console.log('  Every entry the model can express was recorded. The rest is for a person to read.\n')
