import { useEffect, useMemo, useState } from 'react'
import { billingAvailable, buyPlayProduct, loadPlayProducts, PLAY_PRODUCTS, restorePlayPurchases, type PlayProduct } from '../data/playBilling'
import { useApp } from '../state/AppContext'
import { Card } from './common'

const FALLBACK_PRICES: Record<string, string> = {
  [PLAY_PRODUCTS.monthly]: '1 500 FCFA / mois',
  [PLAY_PRODUCTS.annual]: '12 000 FCFA / an',
}

export default function Premium({ go }: { go: (screen: string) => void }) {
  const { session } = useApp()
  const [products, setProducts] = useState<PlayProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const loaded = await loadPlayProducts()
        if (alive) setProducts(loaded)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Impossible de charger les offres Google Play.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const byId = useMemo(() => new Map(products.map((p) => [p.productId, p])), [products])

  async function subscribe(productId: string) {
    const product = byId.get(productId)
    if (!product) {
      setError('Cette offre n’est pas encore disponible sur Google Play.')
      return
    }
    setBusy(productId)
    setError('')
    setMessage('')
    try {
      await buyPlayProduct(product)
      setMessage('Premium est activé sur votre compte.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Achat interrompu.')
    } finally {
      setBusy(null)
    }
  }

  async function restore() {
    setBusy('restore')
    setError('')
    setMessage('')
    try {
      const count = await restorePlayPurchases()
      setMessage(count > 0 ? 'Vos achats Google Play ont été restaurés.' : 'Aucun abonnement actif à restaurer.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restauration impossible.')
    } finally {
      setBusy(null)
    }
  }

  const native = billingAvailable()

  return (
    <div className="premium-page">
      <Card className="premium-hero">
        <div className="eyebrow">MON BUDGET FAMILIAL PREMIUM</div>
        <h2>Gardez le contrôle de votre budget, toute l’année.</h2>
        <p>Premium accompagne votre discipline financière avec l’ensemble des outils avancés de planification, d’analyse et de sauvegarde cloud.</p>
        <div className="premium-benefits">
          <span>✓ Rapports et score détaillés</span>
          <span>✓ Objectifs et provisions avancés</span>
          <span>✓ Sauvegarde et restauration cloud</span>
          <span>✓ Synchronisation sur plusieurs appareils</span>
        </div>
      </Card>

      <div className="premium-plans">
        <Plan
          title="Mensuel"
          price={byId.get(PLAY_PRODUCTS.monthly)?.formattedPrice || FALLBACK_PRICES[PLAY_PRODUCTS.monthly]}
          note="Sans engagement long terme"
          disabled={!native || loading || busy !== null || !session}
          busy={busy === PLAY_PRODUCTS.monthly}
          onClick={() => void subscribe(PLAY_PRODUCTS.monthly)}
        />
        <Plan
          title="Annuel"
          price={byId.get(PLAY_PRODUCTS.annual)?.formattedPrice || FALLBACK_PRICES[PLAY_PRODUCTS.annual]}
          note="Économisez 6 000 FCFA par rapport au mensuel"
          badge="RECOMMANDÉ"
          disabled={!native || loading || busy !== null || !session}
          busy={busy === PLAY_PRODUCTS.annual}
          onClick={() => void subscribe(PLAY_PRODUCTS.annual)}
        />
      </div>

      {!session && <div className="banner warn">Connectez-vous d’abord à votre compte pour que Premium puisse être restauré sur un nouvel appareil.</div>}
      {!native && <div className="banner warn">Les abonnements sont disponibles dans la version Android installée depuis Google Play.</div>}
      {error && <div className="banner err">{error}</div>}
      {message && <div className="banner">{message}</div>}

      <button className="btn" disabled={!native || busy !== null} onClick={() => void restore()}>
        {busy === 'restore' ? 'Restauration…' : 'Restaurer mes achats'}
      </button>
      {!session && <button className="btn ghost mt" onClick={() => go('connexion')}>Se connecter</button>}
      <p className="tiny mt">Le paiement est traité par Google Play. L’accès Premium est accordé uniquement après validation de l’achat côté serveur.</p>
    </div>
  )
}

function Plan({ title, price, note, badge, disabled, busy, onClick }: { title: string; price: string; note: string; badge?: string; disabled: boolean; busy: boolean; onClick: () => void }) {
  return (
    <Card className={`premium-plan ${badge ? 'featured' : ''}`}>
      {badge && <div className="status-badge ok">{badge}</div>}
      <h3>{title}</h3>
      <div className="money-display premium-price">{price}</div>
      <p>{note}</p>
      <button className="btn primary" disabled={disabled} onClick={onClick}>{busy ? 'Ouverture de Google Play…' : `Choisir ${title.toLowerCase()}`}</button>
    </Card>
  )
}
