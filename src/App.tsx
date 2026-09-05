import { useEffect, useState } from 'react'
import { monthLabel, shiftMonth, currentMonth } from './domain/dates'
import { getPremiumEntitlement, premiumGateEnabled } from './data/entitlement'
import { pinIsSet } from './data/pin'
import { isCloudConfigured } from './data/supabase'
import { useI18n } from './i18n'
import { useApp } from './state/AppContext'
import AddExpense from './ui/AddExpense'
import Budget from './ui/Budget'
import Charges from './ui/Charges'
import Connexion from './ui/Connexion'
import Dashboard from './ui/Dashboard'
import DeleteAccount from './ui/DeleteAccount'
import Epargne from './ui/Epargne'
import Historique from './ui/Historique'
import Objectifs from './ui/Objectifs'
import Plus from './ui/Plus'
import Premium from './ui/Premium'
import Profil from './ui/Profil'
import Provisions from './ui/Provisions'
import Rapport from './ui/Rapport'
import Revenus from './ui/Revenus'
import Verrou from './ui/Verrou'
import { Icon, type IconName } from './ui/common'

const TITLE_KEYS: Record<string, string> = {
  accueil: 'app.title',
  budget: 'app.budget',
  historique: 'app.activity',
  plus: 'app.more',
  premium: 'Premium',
  objectifs: 'app.goals',
  profil: 'app.profile',
  revenus: 'app.income',
  charges: 'app.bills',
  epargne: 'app.savings',
  preparer: 'app.prepare',
  rapport: 'app.reports',
  connexion: 'app.account',
  suppression: 'app.deleteAccount',
}

const DERNIER_MOIS_CONSULTABLE = shiftMonth(currentMonth(), 12)
const PREMIUM_SCREENS = new Set(['objectifs', 'preparer', 'rapport'])

const TABS: { key: string; labelKey: string; icon: IconName }[] = [
  { key: 'accueil', labelKey: 'app.home', icon: 'home' },
  { key: 'budget', labelKey: 'app.budget', icon: 'wallet' },
  { key: 'ajouter', labelKey: 'app.add', icon: 'plus' },
  { key: 'historique', labelKey: 'app.activity', icon: 'activity' },
  { key: 'plus', labelKey: 'app.more', icon: 'menu' },
]

const PRIMARY = new Set(['accueil', 'budget', 'historique', 'plus'])

type NavigationState = {
  screen?: string
  overlay?: 'add'
}

export default function App() {
  const { t } = useI18n()
  const { month, setMonth, online, session, hideAmounts, setHideAmounts, ledger } = useApp()
  const [screen, setScreen] = useState(() => sessionStorage.getItem('mbf_screen') || 'accueil')
  const [adding, setAdding] = useState(false)
  const [locked, setLocked] = useState(() => pinIsSet())
  const [premiumActive, setPremiumActive] = useState(() => !premiumGateEnabled())

  useEffect(() => {
    sessionStorage.setItem('mbf_screen', screen)
  }, [screen])

  useEffect(() => {
    const state = window.history.state as NavigationState | null
    if (!state?.screen) window.history.replaceState({ screen }, '', window.location.href)
  }, [])

  useEffect(() => {
    let alive = true
    const refresh = () => {
      void getPremiumEntitlement().then((entitlement) => {
        if (alive) setPremiumActive(entitlement.active)
      })
    }
    refresh()
    window.addEventListener('mbf-premium-changed', refresh)
    return () => {
      alive = false
      window.removeEventListener('mbf-premium-changed', refresh)
    }
  }, [session?.id, online])

  function navigate(requested: string) {
    const next = premiumGateEnabled() && PREMIUM_SCREENS.has(requested) && !premiumActive ? 'premium' : requested
    if (next === screen) return
    window.history.pushState({ screen: next }, '', window.location.href)
    setScreen(next)
  }

  function openAdd() {
    if (adding) return
    window.history.pushState({ screen, overlay: 'add' }, '', window.location.href)
    setAdding(true)
  }

  function closeAdd() {
    const state = window.history.state as NavigationState | null
    if (state?.overlay === 'add') {
      window.history.back()
      return
    }
    setAdding(false)
  }

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const state = event.state as NavigationState | null
      if (adding) setAdding(false)
      const requested = state?.screen || 'accueil'
      setScreen(premiumGateEnabled() && PREMIUM_SCREENS.has(requested) && !premiumActive ? 'premium' : requested)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [adding, premiumActive])

  if (locked) return <Verrou onUnlock={() => setLocked(false)} />

  const isEmpty = ledger.incomes.every((i) => i.deleted_at !== null) && ledger.envelopes.every((e) => e.deleted_at !== null) && ledger.charges.every((c) => c.deleted_at !== null)
  const showMonth = !['profil', 'connexion', 'plus', 'premium', 'suppression'].includes(screen)
  const connectedLabel = !online ? t('app.offline') : session ? t('app.synced') : isCloudConfigured ? t('app.notConnected') : t('app.localOnly')
  const titleKey = TITLE_KEYS[screen] ?? 'app.title'
  const title = titleKey === 'Premium' ? 'Premium' : t(titleKey)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-copy">
            {screen === 'accueil' && <div className="eyebrow">{t('app.hello')}</div>}
            <h1>{title}</h1>
            <div className="sub"><span className={`sync-dot ${online && session ? 'ok' : ''}`} />{ledger.settings.household_name} · {connectedLabel}</div>
          </div>
          <button className="icon-button top-action" aria-label={hideAmounts ? t('app.showAmounts') : t('app.hideAmounts')} onClick={() => setHideAmounts(!hideAmounts)}>
            <Icon name={hideAmounts ? 'eye' : 'eyeOff'} size={21} />
          </button>
        </div>
      </header>

      <main>
        {showMonth && (
          <div className="month-selector" aria-label={t('app.monthSelector')}>
            <button className="month-arrow" aria-label={t('app.previousMonth')} onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevronLeft" size={20}/></button>
            <div className="month-current">{monthLabel(month)}</div>
            <button className="month-arrow" aria-label={t('app.nextMonth')} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= DERNIER_MOIS_CONSULTABLE}><Icon name="chevronRight" size={20}/></button>
          </div>
        )}

        {isEmpty && screen === 'accueil' && <Bienvenue go={navigate} />}
        {screen === 'accueil' && <Dashboard go={navigate} onAdd={openAdd} />}
        {screen === 'budget' && <Budget />}
        {screen === 'historique' && <Historique />}
        {screen === 'plus' && <Plus go={navigate} />}
        {screen === 'premium' && <Premium go={navigate} />}
        {screen === 'objectifs' && <Objectifs />}
        {screen === 'profil' && <Profil go={navigate} />}
        {screen === 'revenus' && <Revenus />}
        {screen === 'charges' && <Charges />}
        {screen === 'epargne' && <Epargne />}
        {screen === 'preparer' && <Provisions />}
        {screen === 'rapport' && <Rapport />}
        {screen === 'connexion' && <Connexion onDone={() => navigate('plus')} />}
        {screen === 'suppression' && <DeleteAccount onDone={() => navigate('plus')} />}

        {!PRIMARY.has(screen) && !['connexion', 'suppression'].includes(screen) && <button className="btn ghost back-link" onClick={() => navigate('plus')}>{t('app.backToMenu')}</button>}
      </main>

      <nav className="tabbar" aria-label={t('app.mainNavigation')}>
        {TABS.map((tab) => {
          const active = tab.key !== 'ajouter' && screen === tab.key
          return <button key={tab.key} aria-current={active ? 'page' : undefined} className={`tab ${tab.key === 'ajouter' ? 'add' : ''} ${active ? 'on' : ''}`} onClick={() => tab.key === 'ajouter' ? openAdd() : navigate(tab.key)}>
            <span className="tab-icon"><Icon name={tab.icon} size={22}/></span><span>{t(tab.labelKey)}</span>
          </button>
        })}
      </nav>

      {adding && <AddExpense onClose={closeAdd} />}
    </div>
  )
}

function Bienvenue({ go }: { go: (s: string) => void }) {
  const { t } = useI18n()
  return <section className="card onboarding-card"><div className="onboarding-step">{t('onboarding.step')}</div><h3>{t('onboarding.title')}</h3><p>{t('onboarding.body')}</p><div className="onboarding-actions"><button className="btn primary" onClick={() => go('revenus')}>{t('onboarding.income')}</button><button className="btn" onClick={() => go('charges')}>{t('onboarding.bills')}</button><button className="btn" onClick={() => go('budget')}>{t('onboarding.envelopes')}</button></div></section>
}
