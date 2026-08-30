/**
 * Service worker de Mon Budget Familial.
 *
 * Regle de securite non negociable : AUCUNE reponse du backend financier
 * (Supabase) n'est mise en cache. Un cache de donnees financieres survivrait
 * a une deconnexion et pourrait etre relu par le compte suivant sur le meme
 * appareil. Seule la coquille applicative est mise en cache.
 */

const CACHE = 'mbf-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Tout ce qui n'est pas notre propre origine (donc le backend) passe
  // directement au reseau, sans jamais etre stocke.
  if (url.origin !== self.location.origin) return

  // Navigation : reseau d'abord, coquille en repli hors connexion.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    )
    return
  }

  // Ressources statiques : cache d'abord, puis reseau.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return response
        }),
    ),
  )
})
