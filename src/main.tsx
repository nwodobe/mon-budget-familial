import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProvider } from './state/AppContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)

/**
 * Dans l'APK Android, les fichiers sont deja sur l'appareil : l'application
 * fonctionne hors connexion sans service worker. En enregistrer un n'apporte
 * rien et cree un risque reel — apres une mise a jour de l'application, le
 * cache pourrait continuer a servir l'ancienne version.
 */
const dansApplicationNative = 'Capacitor' in window

// Service worker : coquille applicative hors connexion. Il ne met JAMAIS en
// cache les reponses du backend financier (voir public/sw.js).
if ('serviceWorker' in navigator && import.meta.env.PROD && !dansApplicationNative) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // Un echec d'enregistrement ne doit pas empecher l'application de servir.
    })
  })
}
