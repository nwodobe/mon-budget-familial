/**
 * Genere les icones PNG de l'application sans dependance externe.
 *
 * Motif : fond vert profond, trois barres ascendantes blanches et une ligne
 * de base - une lecture de budget, pas un logo decoratif.
 *
 * Usage : node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const BG = [11, 61, 46]
const FG = [255, 255, 255]
const ACCENT = [79, 191, 144]

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const pad = Math.round(size * 0.18)
  const baseline = size - pad
  const barWidth = Math.round((size - 2 * pad) / 5)
  const gap = Math.round(barWidth / 2)
  const heights = [0.30, 0.52, 0.74]

  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filtre "none"
    for (let x = 0; x < size; x++) {
      let color = BG
      // Ligne de base
      if (y >= baseline && y < baseline + Math.max(2, Math.round(size / 40))) color = ACCENT
      // Barres
      for (let i = 0; i < 3; i++) {
        const x0 = pad + i * (barWidth + gap)
        const x1 = x0 + barWidth
        const top = baseline - Math.round((size - 2 * pad) * heights[i])
        if (x >= x0 && x < x1 && y >= top && y < baseline) color = i === 2 ? ACCENT : FG
      }
      raw[p++] = color[0]
      raw[p++] = color[1]
      raw[p++] = color[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(join(ROOT, 'public'), { recursive: true })
for (const size of [192, 512]) {
  const png = makePng(size)
  const file = join(ROOT, 'public', `icon-${size}.png`)
  writeFileSync(file, png)
  console.log(`icon-${size}.png ecrit (${png.length} octets)`)
}
