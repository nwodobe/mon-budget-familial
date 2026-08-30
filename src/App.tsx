import { useState } from 'react'
import { monthLabel, shiftMonth, currentMonth } from './domain/dates'
import { pinIsSet } from './data/pin'
import { isCloudConfigured } from './data/supabase'
import { useApp } from './state/AppContext'
import AddExpense from './ui/AddExpense'
import Budget from './ui/Budget'
import Charges from './ui/Charges'
import Connexion from './ui/Connexion'
import Dashboard from './ui/Dashboard'
import Epargne from './ui/Epargne'
import Historique from './ui/Historique'
import Objectifs from './ui/Objectifs'
import Profil from './ui/Profil'
import Provisions from './ui/Provisions'
import Rapport from './ui/Rapport'
import Revenus from './ui/Revenus'
import Verrou from './ui/Verrou'

const TITLES: Record<string, string> = {
  accueil: 'Mon Budget Familial',
  budget: 'Enveloppes budgétaires',
  objectifs: 'Objectifs',
  profil: 'Profil',
  revenus: 'Revenus',
  charges: 'Charges obligatoires',
  epargne: 'Épargne',
  preparer: 'À préparer',
  historique: 'Historique',
  rapport: 'Rapports',
  connexion: 'Compte',
}

const TABS = [
  { key: 'accueil', label: 'Accueil' },
  { key: 'budget', label: 'Budget' },
  { key: 'ajouter', label: 'Ajouter' },
  { key: 'objectifs', label: 'Objectifs' },
  { key: 'profil', label: 'Profil' },
]

export default function App() {
  const { month, setMonth, snapshot, online, session, hideAmounts, setHideAmounts, ledger } = useApp()
  const [screen, setScreen] = useState('accueil')
  const [adding, setAdding] = useState(false)
  const [locked, setLocked] = useState(() => pinIsSet())

  if (locked) return <Verrou onUnlock={() => setLocked(false)} />

  const isEmpty =
    ledger.incomes.filter((i) => i.deleted_at === null).length === 0 &&
    ledger.envelopes.filter((e) => e.deleted_at === null).length === 0 &&
    ledger.charges.filter((c) => c.deleted_at === null).length === 0

  const tabFor = (key: string) => (key === 'ajouter' ? screen : key)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div>
            <h1>{TITLES[screen] ?? 'Mon Budget Familial'}</h1>
            <div className="sub">
              {ledger.settings.household_name} - {monthLabel(month)}
              {!online
                ? ' - hors connexion'
                : session
                  ? ''
                  : isCloudConfigured
                    ? ' - non connecté'
                    : ' - local seul'}
            </div>
          </div>
          <button className="icon-btn" onClick={() => setHideAmounts(!hideAmounts)}>
            {hideAmounts ? 'Afficher' : 'Masquer'}
          </button>
        </div>
      </header>

      <main>
        {screen !== 'profil' && screen !== 'connexion' && (
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="month-switch">
              <button className="btn small ghost" onClick={() => setMonth(shiftMonth(month, -1))}>Mois précédent</button>
              <span className="m">{monthLabel(month)}</span>
              <button className="btn small ghost" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= currentMonth()}>Mois suivant</button>
            </div>
          </div>
        )}

        {isEmpty && screen === 'accueil' && <Bienvenue go={setScreen} />}
        {screen === 'accueil' && <Dashboard go={setScreen} />}
        {screen === 'budget' && <Budget />}
        {screen === 'objectifs' && <Objectifs />}
        {screen === 'profil' && <Profil go={setScreen} />}
        {screen === 'revenus' && <Revenus />}
        {screen === 'charges' && <Charges />}
        {screen === 'epargne' && <Epargne />}
        {screen === 'preparer' && <Provisions />}
        {screen === 'historique' && <Historique />}
        {screen === 'rapport' && <Rapport />}
        {screen === 'connexion' && <Connexion onDone={() => setScreen('profil')} />}

        {!['accueil', 'budget', 'objectifs', 'profil'].includes(screen) && (
          <button className="btn ghost" onClick={() => setScreen('accueil')}>Retour à l'accueil</button>
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${t.key === 'ajouter' ? 'add' : ''} ${screen === tabFor(t.key) && t.key !== 'ajouter' ? 'on' : ''}`}
            onClick={() => (t.key === 'ajouter' ? setAdding(true) : setScreen(t.key))}
          >
            <span className="glyph" />
            {t.label}
          </button>
        ))}
      </nav>

      {adding && <AddExpense onClose={() => setAdding(false)} />}
      {snapshot.health === 'danger' && screen === 'accueil' && !isEmpty && <div style={{ display: 'none' }} aria-hidden />}
    </div>
  )
}

function Bienvenue({ go }: { go: (s: string) => void }) {
  return (
    <section className="card">
      <h3>Trois étapes pour démarrer</h3>
      <p className="tiny" style={{ marginTop: 0 }}>
        L'application répond à une seule question : combien puis-je encore dépenser sans mettre en danger mes charges, mon épargne et mes objectifs ?
      </p>
      <div className="btn-row" style={{ marginBottom: 10 }}><button className="btn primary" onClick={() => go('revenus')}>1. Mes revenus</button></div>
      <div className="btn-row" style={{ marginBottom: 10 }}><button className="btn" onClick={() => go('charges')}>2. Mes charges fixes</button></div>
      <div className="btn-row"><button className="btn" onClick={() => go('budget')}>3. Mes enveloppes</button></div>
    </section>
  )
}
