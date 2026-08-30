/**
 * Sert le build de GitHub Pages en local, sur le meme sous-chemin qu'en ligne.
 *
 * `vite preview` lit la base depuis vite.config.ts, qui la tire de APP_BASE.
 * Sans cette variable, l'apercu sert a la racine pendant que le HTML construit
 * pointe vers /mon-budget-familial/ : toutes les ressources repondent 404.
 *
 * Sert aussi a eprouver le mode hors connexion : on charge la page, puis on
 * arrete ce serveur, et le service worker doit continuer a servir.
 */
import { preview } from 'vite'

process.env.APP_BASE = process.env.APP_BASE ?? '/mon-budget-familial/'

const server = await preview({
  preview: { port: Number(process.env.PORT ?? 5181), strictPort: true },
})

server.printUrls()
