import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Configuration de l'enveloppe Android.
 *
 * ATTENTION sur `appId` : un identifiant d'application est IMMUABLE une fois
 * l'application deposee sur le Play Store. Celui-ci suit le domaine reellement
 * detenu (nwodobe.github.io), il n'a donc pas a etre change plus tard.
 */
const config: CapacitorConfig = {
  appId: 'io.github.nwodobe.monbudgetfamilial',
  appName: 'Mon Budget Familial',
  webDir: 'dist',
  android: {
    // Le contenu est local : aucun trafic en clair n'est autorise.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
