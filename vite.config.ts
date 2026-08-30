import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Chemin de base du site. Vaut "/" a la racine d'un domaine (Netlify) et
// "/mon-budget-familial/" sous GitHub Pages, ou le site vit dans un
// sous-repertoire. Tout ce qui pointe vers une ressource doit en tenir compte,
// sinon la PWA se casse : manifeste introuvable, service worker hors portee.
const base = process.env.APP_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5180 },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as never)
