import { dateLabel, monthLabel } from '../domain/dates'
import { computeWeek, type MonthSnapshot } from '../domain/engine'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Icon, Money, Row, StatCard, useMoneyText } from './common'

const HEALTH_LABEL: Record<string, string> = {
  saine: 'Situation saine',
  attention: 'À surveiller',
  danger: 'Budget en danger',
}

export default function Dashboard({ go }: { go: (screen: string) => void }) {
  const { snapshot: s, ledger, goals, today, month } = useApp()
  const money = useMoneyText()
  const week = computeWeek(ledger, s as unknown as MonthSnapshot, today)
  const nextCharge = s.charges.find((c) => !c.paid)
  const alertEnvelopes = s.envelopes.filter((e) => e.state !== 'sain').slice(0, 3)
  const hasWatchItems = Boolean(nextCharge?.late || alertEnvelopes.length || s.todayOverBy > 0 || s.deficit > 0)

  return <>
    <section className={`hero-card ${s.health === 'danger' ? 'danger' : s.health === 'attention' ? 'warning' : ''}`}>
      <div className="hero-topline"><span>Disponible à dépenser</span><span className="hero-status"><span className={`dot ${s.health === 'saine' ? 'ok' : s.health === 'attention' ? 'warn' : 'danger'}`} />{HEALTH_LABEL[s.health]}</span></div>
      <div className="hero-money"><Money value={s.spendable} currency={false} /><span>FCFA</span></div>
      <p>{s.deficit > 0 ? <>Déficit à couvrir : <strong>{money(s.deficit)}</strong></> : 'Après vos charges, votre épargne et vos provisions protégées.'}</p>
    </section>

    <section className="today-section">
      <div className="section-title-row"><div><span className="eyebrow dark">Aujourd'hui</span><h2>Votre marge du jour</h2></div></div>
      <div className="stats-grid">
        <StatCard label="Budget" value={<Money value={s.todayBudget} currency={false}/>} />
        <StatCard label="Dépensé" value={<Money value={s.todaySpent} currency={false}/>} tone={s.todayOverBy > 0 ? 'danger' : 'neutral'} />
        <StatCard label={s.todayOverBy > 0 ? 'Dépassé' : 'Reste'} value={<Money value={s.todayOverBy > 0 ? s.todayOverBy : s.todayRemaining} currency={false}/>} tone={s.todayOverBy > 0 ? 'danger' : 'positive'} />
      </div>
      <div className="stats-currency">Montants en FCFA</div>
    </section>

    <div className="quick-actions">
      <button onClick={() => document.querySelector<HTMLButtonElement>('.tab.add')?.click()}><span><Icon name="plus"/></span>Dépense</button>
      <button onClick={() => go('revenus')}><span><Icon name="income"/></span>Revenu</button>
      <button onClick={() => go('epargne')}><span><Icon name="savings"/></span>Épargne</button>
    </div>

    {hasWatchItems && <Card title="À surveiller" className="watch-card">
      {s.deficit > 0 && <div className="watch-item danger"><span className="watch-icon"><Icon name="alert" size={19}/></span><div><strong>Déficit à couvrir</strong><small>{money(s.deficit)} manquent pour protéger le mois.</small></div></div>}
      {s.todayOverBy > 0 && <div className="watch-item warning"><span className="watch-icon"><Icon name="alert" size={19}/></span><div><strong>Budget du jour dépassé</strong><small>Vous avez dépassé le rythme conseillé de {money(s.todayOverBy)}.</small></div></div>}
      {nextCharge?.late && <div className="watch-item danger"><span className="watch-icon"><Icon name="charges" size={19}/></span><div><strong>{nextCharge.label} est en retard</strong><small>{money(nextCharge.amount)} étaient prévus le {dateLabel(nextCharge.dueDate)}.</small></div></div>}
      {alertEnvelopes.map((e) => <div className={`watch-item ${e.state === 'depasse' ? 'danger' : 'warning'}`} key={e.id}><span className="watch-icon"><Icon name="wallet" size={19}/></span><div><strong>{e.name} · {e.usedPct}%</strong><small>{e.state === 'depasse' ? `Dépassement de ${money(Math.abs(e.remaining))}.` : `Il reste ${money(e.remaining)} dans cette enveloppe.`}</small></div></div>)}
    </Card>}

    <Card title={`Vue d'ensemble · ${monthLabel(month)}`}>
      <div className="rows compact">
        <Row k="Revenus encaissés" v={<Money value={s.income}/>} tone="pos" />
        {s.incomeExpected > 0 && <Row k="Revenus à venir" v={<Money value={s.incomeExpected}/>} note="Non comptés dans le Disponible sûr" />}
        <Row k="Charges restantes" v={<Money value={s.chargesRemaining}/>} />
        <Row k="Épargne réalisée" v={<Money value={s.savingsDone}/>} tone="pos" />
      </div>
    </Card>

    {nextCharge && <Card title="Prochaine charge" action={<button className="text-action" onClick={() => go('charges')}>Voir tout</button>}>
      <button className="next-charge" onClick={() => go('charges')}><span className="charge-icon"><Icon name="charges"/></span><span className="charge-copy"><strong>{nextCharge.label}</strong><small>Échéance {dateLabel(nextCharge.dueDate)}{nextCharge.late ? ' · en retard' : ''}</small></span><span className="charge-amount"><Money value={nextCharge.amount}/></span><Icon name="chevronRight" size={18}/></button>
    </Card>}

    <Card title="Enveloppes" action={<button className="text-action" onClick={() => go('budget')}>Gérer</button>}>
      {s.envelopes.length === 0 ? <Empty text="Créez vos premières enveloppes pour décider où va votre argent." /> : s.envelopes.slice(0, 4).map((e) => <div className="env premium-env" key={e.id}><div className="env-head"><div className="env-name">{e.name}</div><div className={`env-fig ${e.state}`}>{e.usedPct}%</div></div><Bar pct={e.usedPct} state={e.state}/><div className="env-sub"><span><Money value={e.spent}/> dépensés</span><span>{e.remaining >= 0 ? 'Reste ' : 'Dépassement '}<Money value={Math.abs(e.remaining)}/></span></div></div>)}
    </Card>

    <div className="dashboard-two-col">
      <Card title="Score de discipline" action={<button className="text-action" onClick={() => go('rapport')}>Détail</button>}>
        <div className="score-premium"><div className="score-ring"><span>{s.score.measurable ? s.score.value : '--'}</span><small>/100</small></div><div><strong>{s.score.label}</strong><p>{s.score.measurable ? 'Votre discipline financière ce mois-ci.' : 'Ajoutez vos données pour obtenir votre score.'}</p></div></div>
      </Card>
      <Card title="Cette semaine"><div className="rows compact"><Row k="Dépenses" v={<Money value={week.spent}/>} /><Row k="Rythme prévu" v={<Money value={week.expectedPace}/>} tone={week.gap > 0 ? 'neg' : 'pos'} /></div><div className={`week-verdict ${week.willHold ? 'ok' : 'warn'}`}><Icon name={week.willHold ? 'check' : 'alert'} size={18}/>{week.verdict}</div></Card>
    </div>

    {(s.provisions.length > 0 || goals.length > 0) && <Card title="Vos projets">
      {s.provisions.length > 0 && <button className="project-row" onClick={() => go('preparer')}><span className="menu-icon"><Icon name="prepare"/></span><span><strong>{s.provisions[0].name}</strong><small>{money(s.provisions[0].monthlyNeeded)}/mois recommandé</small></span><Icon name="chevronRight" size={18}/></button>}
      {goals.length > 0 && <button className="project-row" onClick={() => go('objectifs')}><span className="menu-icon"><Icon name="target"/></span><span><strong>{goals[0].name}</strong><small>{goals[0].progressPct}% atteint</small></span><Icon name="chevronRight" size={18}/></button>}
    </Card>}
  </>
}
