import { useEffect, useMemo, useState } from 'react'
import { billingAvailable, buyPlayProduct, loadPlayProducts, PLAY_PRODUCTS, restorePlayPurchases, type PlayProduct } from '../data/playBilling'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Card } from './common'

const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions'

export default function Premium({ go }: { go: (screen: string) => void }) {
  const { t } = useI18n()
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
        if (alive) setError(e instanceof Error ? e.message : t('premium.loadError'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [t])

  const byId = useMemo(() => new Map(products.map((p) => [p.productId, p])), [products])

  async function subscribe(productId: string) {
    const product = byId.get(productId)
    if (!product) {
      setError(t('premium.notAvailable'))
      return
    }
    setBusy(productId)
    setError('')
    setMessage('')
    try {
      await buyPlayProduct(product)
      window.dispatchEvent(new Event('mbf-premium-changed'))
      setMessage(t('premium.activated'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('premium.purchaseInterrupted'))
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
      if (count > 0) window.dispatchEvent(new Event('mbf-premium-changed'))
      setMessage(count > 0 ? t('premium.restored') : t('premium.noneToRestore'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('premium.restoreFailed'))
    } finally {
      setBusy(null)
    }
  }

  const native = billingAvailable()
  const monthlyPrice = byId.get(PLAY_PRODUCTS.monthly)?.formattedPrice ?? t('premium.priceInPlay')
  const annualPrice = byId.get(PLAY_PRODUCTS.annual)?.formattedPrice ?? t('premium.priceInPlay')

  return (
    <div className="premium-page">
      <Card className="premium-hero">
        <div className="eyebrow">{t('premium.hero')}</div>
        <h2>{t('premium.title')}</h2>
        <p>{t('premium.body')}</p>
        <div className="premium-benefits">
          <span>{t('premium.benefitReports')}</span>
          <span>{t('premium.benefitGoals')}</span>
          <span>{t('premium.benefitCloud')}</span>
          <span>{t('premium.benefitSync')}</span>
        </div>
      </Card>

      <div className="premium-plans">
        <Plan title={t('premium.monthly')} price={monthlyPrice} note={t('premium.monthlyNote')} disabled={!native || loading || busy !== null || !session} busy={busy === PLAY_PRODUCTS.monthly} onClick={() => void subscribe(PLAY_PRODUCTS.monthly)} />
        <Plan title={t('premium.annual')} price={annualPrice} note={t('premium.annualNote')} badge={t('common.recommended')} disabled={!native || loading || busy !== null || !session} busy={busy === PLAY_PRODUCTS.annual} onClick={() => void subscribe(PLAY_PRODUCTS.annual)} />
      </div>

      {!session && <div className="banner warn">{t('premium.signInFirst')}</div>}
      {!native && <div className="banner warn">{t('premium.androidOnly')}</div>}
      {error && <div className="banner err">{error}</div>}
      {message && <div className="banner">{message}</div>}

      <div className="btn-row">
        <button className="btn" disabled={!native || busy !== null} onClick={() => void restore()}>{busy === 'restore' ? t('premium.restoring') : t('premium.restore')}</button>
        <button className="btn" onClick={() => window.open(PLAY_SUBSCRIPTIONS_URL, '_blank', 'noopener,noreferrer')}>{t('premium.manage')}</button>
      </div>
      {!session && <button className="btn ghost mt" onClick={() => go('connexion')}>{t('premium.signIn')}</button>}
      <p className="tiny mt">{t('premium.legal')}</p>
    </div>
  )
}

function Plan({ title, price, note, badge, disabled, busy, onClick }: { title: string; price: string; note: string; badge?: string; disabled: boolean; busy: boolean; onClick: () => void }) {
  const { t } = useI18n()
  return (
    <Card className={`premium-plan ${badge ? 'featured' : ''}`}>
      {badge && <div className="status-badge ok">{badge}</div>}
      <h3>{title}</h3>
      <div className="money-display premium-price">{price}</div>
      <p>{note}</p>
      <button className="btn primary" disabled={disabled} onClick={onClick}>{busy ? t('premium.openingPlay') : t('premium.choose', { plan: title.toLowerCase() })}</button>
    </Card>
  )
}
