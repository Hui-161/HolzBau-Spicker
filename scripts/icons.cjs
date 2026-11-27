// Erzeugt die PNG-Icons aus public/icon.svg (einmalig, braucht Playwright).
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const pub = path.join(__dirname, '..', 'public')
const svg = fs.readFileSync(path.join(pub, 'icon.svg'), 'utf8')
// maskable/apple: vollflächig ohne runde Ecken, Motiv in der sicheren Zone
const voll = svg.replace('rx="96"', 'rx="0"').replace('<g ', '<g transform="translate(51 51) scale(0.8)" ')

;(async () => {
  const browser = await chromium.launch()
  const seite = await browser.newPage()
  for (const [name, groesse, quelle, transparent] of [
    ['icon-192.png', 192, svg, true],
    ['icon-512.png', 512, svg, true],
    ['icon-maskable-512.png', 512, voll, false],
    ['apple-touch-icon.png', 180, voll, false],
  ]) {
    await seite.setViewportSize({ width: groesse, height: groesse })
    await seite.setContent(`<style>*{margin:0}svg{display:block;width:${groesse}px;height:${groesse}px}</style>${quelle}`)
    await seite.screenshot({ path: path.join(pub, name), omitBackground: transparent })
  }
  await browser.close()
})()
