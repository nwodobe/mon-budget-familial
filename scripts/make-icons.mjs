/**
 * Genere les images de l'application sans dependance externe.
 *
 * Motif : fond vert profond, trois barres ascendantes et une ligne de base -
 * une lecture de budget, pas un logo decoratif.
 *
 * Sorties :
 *   public/icon-192.png, public/icon-512.png   icones de la PWA
 *   assets/icon.png       (1024)               source pour @capacitor/assets
 *   assets/splash.png     (2732)               ecran de demarrage Android
 *   assets/splash-dark.png                     idem, theme sombre
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

const TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
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

/**
 * @param size  cote de l'image en pixels
 * @param cover part du cote occupee par le motif (1 = icone pleine, 0.28 = splash)
 */
function makePng(size, cover = 1) {
  // PNG 32 bits RGBA (8 bits x 4 canaux), compatible avec l'icone de fiche Play.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const motif = Math.round(size * cover)
  const offset = Math.round((size - motif) / 2)

  const pad = Math.round(motif * 0.18)
  const baseline = offset + motif - pad
  const barWidth = Math.round((motif - 2 * pad) / 5)
  const gap = Math.round(barWidth / 2)
  const heights = [0.3, 0.52, 0.74]
  const baseThickness = Math.max(2, Math.round(motif / 40))

  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filtre "none"
    for (let x = 0; x < size; x++) {
      let color = BG
      if (y >= baseline && y < baseline + baseThickness && x >= offset + pad && x < offset + motif - pad) {
        color = ACCENT
      }
      for (let i = 0; i < 3; i++) {
        const x0 = offset + pad + i * (barWidth + gap)
        const x1 = x0 + barWidth
        const top = baseline - Math.round((motif - 2 * pad) * heights[i])
        if (x >= x0 && x < x1 && y >= top && y < baseline) color = i === 2 ? ACCENT : FG
      }
      raw[p++] = color[0]
      raw[p++] = color[1]
      raw[p++] = color[2]
      raw[p++] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // profondeur par canal
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function ecrire(chemin, png) {
  writeFileSync(chemin, png)
  // Controle immediat : un PNG tronque s'affiche a moitie sans lever d'erreur.
  const fin = png.subarray(png.length - 8, png.length - 4).toString('ascii')
  if (fin !== 'IEND') throw new Error(`PNG incomplet : ${chemin}`)
  console.log(`${chemin.replace(ROOT, '.')} ecrit (${png.length} octets)`)
}

mkdirSync(join(ROOT, 'public'), { recursive: true })
mkdirSync(join(ROOT, 'assets'), { recursive: true })

for (const size of [192, 512]) {
  ecrire(join(ROOT, 'public', `icon-${size}.png`), makePng(size))
}
ecrire(join(ROOT, 'assets', 'icon.png'), makePng(1024))
// Le motif de l'icone adaptative Android est rogne par le masque du systeme :
// il doit tenir dans les deux tiers centraux.
ecrire(join(ROOT, 'assets', 'icon-foreground.png'), makePng(1024, 0.62))
ecrire(join(ROOT, 'assets', 'icon-background.png'), makePng(1024, 0))
ecrire(join(ROOT, 'assets', 'splash.png'), makePng(2732, 0.28))
ecrire(join(ROOT, 'assets', 'splash-dark.png'), makePng(2732, 0.28))
