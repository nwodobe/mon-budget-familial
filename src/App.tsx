import { useEffect, useState } from 'react'
import { monthLabel, shiftMonth, currentMonth } from './domain/dates'
import { pinIsSet } from './data/pin'
import { isCloudConfigured } from './data/supabase'
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
import Profil from './ui/Profil'
import Provisions from './ui/Provisions'
import Rapport from './ui/Rapport'
import Revenus from './ui/Revenus'
import Verrou from './ui/Verrou'
import { Icon, type IconName } from './ui/common'

const TITLES: Record<string, string> = {
  accueil: 'Mon Budget Familial',
  budget: 'Budget',
  historique: 'Activité',
  plus: 'Plus',
  objectifs: 'Objectifs',
  profil: 'Foyer et préférences',
  revenus: 'Revenus',
  charges: 'Charges obligatoires',
  epargne: 'Épargne',
  preparer: 'À préparer',
  rapport: 'Rapports',
  connexion: 'Compte',
  suppression: 'Supprimer mon compte',
}

const DERNIER_MOIS_CONSULTABLE = shiftMonth(currentMonth(), 12)

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'accueil', label: 'Accueil', icon: 'home' },
  { key: 'budget', label: 'Budget', icon: 'wallet' },
  { key: 'ajouter', label: 'Ajouter', icon: 'plus' },
  { key: 'historique', label: 'Activité', icon: 'activity' },
  { key: 'plus', label: 'Plus', icon: 'menu' },
]

const PRIMARY = new Set(['accueil', 'budget', 'historique', 'plus'])

type NavigationState = {
  screen?: string
  overlay?: 'add'
}

export default function App() {
  const { month, setMonth, online, session, hideAmounts, setHideAmounts, ledger } = useApp()
  const [screen, setScreen] = useState(() => sessionStorage.getItem('mbf_screen') || 'accueil')
  const [adding, setAdding] = useState(false)
  const [locked, setLocked] = useState(() => pinIsSet())

  useEffect(() => {
    sessionStorage.setItem('mbf_screen', screen)
  }, [screen])

  useEffect(() => {
    const state = window.history.state as NavigationState | null
    if (!state?.screen) window.history.replaceState({ screen }, '', window.location.href)
  }, [])

  function navigate(next: string) {
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
      setScreen(state?.screen || 'accueil')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [adding])

  if (locked) return <Verrou onUnlock={() => setLocked(false)} />

  const isEmpty = ledger.incomes.every((i) => i.deleted_at !== null) && ledger.envelopes.every((e) => e.deleted_at !== null) && ledger.charges.every((c) => c.deleted_at !== null)
  const showMonth = !['profil', 'connexion', 'plus', 'suppression'].includes(screen)
  const connectedLabel = !online ? 'Hors connexion' : session ? 'Synchronisé' : isCloudConfigured ? 'Non connecté' : 'Local uniquement'

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-copy">
            {screen === 'accueil' && <div className="eyebrow">Bonjour</div>}
            <h1>{TITLES[screen] ?? 'Mon Budget Familial'}</h1>
            <div className="sub"><span className={`sync-dot ${online && session ? 'ok' : ''}`} />{ledger.settings.household_name} · {connectedLabel}</div>
          </div>
          <button className="icon-button top-action" aria-label={hideAmounts ? 'Afficher les montants' : 'Masquer les montants'} onClick={() => setHideAmounts(!hideAmounts)}>
            <Icon name={hideAmounts ? 'eye' : 'eyeOff'} size={21} />
          </button>
        </div>
      </header>

      <main>
        {showMonth && (
          <div className="month-selector" aria-label="Sélecteur de mois">
            <button className="month-arrow" aria-label="Mois précédent" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevronLeft" size={20}/></button>
            <div className="month-current">{monthLabel(month)}</div>
            <button className="month-arrow" aria-label="Mois suivant" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= DERNIER_MOIS_CONSULTABLE}><Icon name="chevronRight" size={20}/></button>
          </div>
        )}

        {isEmpty && screen === 'accueil' && <Bienvenue go={navigate} />}
        {screen === 'accueil' && <Dashboard go={navigate} onAdd={openAdd} />}
        {screen === 'budget' && <Budget />}
        {screen === 'historique' && <Historique />}
        {screen === 'plus' && <Plus go={navigate} />}
        {screen === 'objectifs' && <Objectifs />}
        {screen === 'profil' && <Profil go={navigate} />}
        {screen === 'revenus' && <Revenus />}
        {screen === 'charges' && <Charges />}
        {screen === 'epargne' && <Epargne />}
        {screen === 'preparer' && <Provisions />}
        {screen === 'rapport' && <Rapport />}
        {screen === 'connexion' && <Connexion onDone={() => navigate('plus')} />}
        {screen === 'suppression' && <DeleteAccount onDone={() => navigate('plus')} />}

        {!PRIMARY.has(screen) && !['connexion', 'suppression'].includes(screen) && <button className="btn ghost back-link" onClick={() => navigate('plus')}>Retour au menu</button>}
      </main>

      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map((t) => {
          const active = t.key !== 'ajouter' && screen === t.key
          return <button key={t.key} aria-current={active ? 'page' : undefined} className={`tab ${t.key === 'ajouter' ? 'add' : ''} ${active ? 'on' : ''}`} onClick={() => t.key === 'ajouter' ? openAdd() : navigate(t.key)}>
            <span className="tab-icon"><Icon name={t.icon} size={22}/></span><span>{t.label}</span>
          </button>
        })}
      </nav>

      {adding && <AddExpense onClose={closeAdd} />}
    </div>
  )
}

function Bienvenue({ go }: { go: (s: string) => void }) {
  return <section className="card onboarding-card"><div className="onboarding-step">Première configuration</div><h3>Votre budget en 3 étapes</h3><p>Ajoutez vos revenus, vos charges fixes puis vos enveloppes. L'application pourra ensuite calculer ce que vous pouvez réellement dépenser.</p><div className="onboarding-actions"><button className="btn primary" onClick={() => go('revenus')}>1. Ajouter mes revenus</button><button className="btn" onClick={() => go('charges')}>2. Ajouter mes charges</button><button className="btn" onClick={() => go('budget')}>3. Créer mes enveloppes</button></div></section>
}
