/**
 * Verrou local par code PIN.
 *
 * Le code n'est jamais stocke : seul un condensat PBKDF2-SHA256 (200 000
 * iterations, sel aleatoire de 16 octets) l'est. Ce verrou protege l'ecran
 * contre un regard indiscret ; il ne chiffre pas la base locale et ne
 * remplace pas le verrouillage de l'appareil.
 */

const PIN_KEY = 'mbf.pin.v1'
const ITERATIONS = 200000

interface StoredPin {
  salt: string
  hash: string
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(value: string): Uint8Array {
  const raw = atob(value)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    256,
  )
  return toBase64(new Uint8Array(bits))
}

export function pinIsSet(): boolean {
  return localStorage.getItem(PIN_KEY) !== null
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt)
  const stored: StoredPin = { salt: toBase64(salt), hash }
  localStorage.setItem(PIN_KEY, JSON.stringify(stored))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = localStorage.getItem(PIN_KEY)
  if (!raw) return true
  const stored = JSON.parse(raw) as StoredPin
  const hash = await derive(pin, fromBase64(stored.salt))
  // Comparaison a temps constant.
  if (hash.length !== stored.hash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i)
  return diff === 0
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY)
}
