import { dateLabel, monthLabel } from '../domain/dates'
import { computeWeek, type MonthSnapshot } from '../domain/engine'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Money, Row, useMoneyText } from './common'

const DOT: Record<string, string> = { saine: 'ok', attention: 'warn', danger: 'danger' }
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

  return (
    <>
      <section className="card hero">
        <div className="label">Disponible à dépenser</div>
        <div className="amount">
          <Money value={s.spendable} currency={false} />
          <span className="currency">FCFA</span>
        </div>
        {s.deficit > 0 ? (
          <div className="daily">Déficit à couvrir : <strong><Money value={s.deficit} /></strong></div>
        ) : (
          <div className="daily">Après charges, épargne et provisions protégées</div>
        )}
        <div className="status">
          <span className={`dot ${DOT[s.health]}`} />
          {HEALTH_LABEL[s.health]}
        </div>
        <div className="status-reason">{s.healthReason}</div>
      </section>

      <Card title="Aujourd'hui">
        <div className="rows">
          <Row k="Budget conseillé aujourd'hui" v={<Money value={s.todayBudget} />} />
          <Row k="Dépensé aujourd'hui" v={<Money value={s.todaySpent} />} tone={s.todayOverBy > 0 ? 'neg' : undefined} />
          <Row
            k={s.todayOverBy > 0 ? 'Dépassement aujourd’hui' : 'Vous pouvez encore dépenser aujourd’hui'}
            v={<Money value={s.todayOverBy > 0 ? s.todayOverBy : s.todayRemaining} />}
            tone={s.todayOverBy > 0 ? 'neg' : 'pos'}
          />
        </div>
        {s.todayOverBy > 0 && (
          <div className="banner mt"><span className="dot warn" />Vous avez dépassé votre budget conseillé aujourd'hui de {money(s.todayOverBy)}.</div>
        )}
      </Card>

      {s.incomeExpected > 0 && (
        <Card title="Revenus à venir">
          <Row k="Encore attendus ce mois" v={<Money value={s.incomeExpected} />} note="Ils ne gonflent pas votre Disponible avant leur date d'encaissement." />
        </Card>
      )}

      <Card title={`Situation - ${monthLabel(month)}`}>
        <div className="rows">
          <Row k="Revenus encaissés" v={<Money value={s.income} />} tone="pos" />
          <Row k="Charges restantes" v={<Money value={s.chargesRemaining} />} />
          <Row k="Épargne déjà réalisée" v={<Money value={s.savingsDone} />} tone="pos" />
          <Row k="Réserve encore à protéger" v={<Money value={s.protectedReserveRemaining} />} />
          <Row k="Dépenses enregistrées" v={<Money value={s.spent} />} tone="neg" />
        </div>
      </Card>

      {nextCharge && (
        <Card title="Prochaine charge" action={<button className="btn small ghost" onClick={() => go('charges')}>Voir</button>}>
          <div className="item">
            <div className="main">
              <div className="title">{nextCharge.label}</div>
              <div className="meta">Échéance {dateLabel(nextCharge.dueDate)}{nextCharge.late ? ' - en retard' : ''}</div>
            </div>
            <div className="amt"><Money value={nextCharge.amount} /></div>
          </div>
        </Card>
      )}

      <Card title="Épargne et grosses dépenses" action={<button className="btn small ghost" onClick={() => go('preparer')}>À préparer</button>}>
        <div className="rows">
          <Row k="Objectif d'épargne du mois" v={<Money value={s.savingsTarget} />} />
          <Row k="Provisions encore à constituer ce mois" v={<Money value={s.provisionsReserveRemaining} />} />
        </div>
        {s.provisions.length > 0 && (
          <div className="tiny mt">Prochaine préparation : {s.provisions[0].name} — {money(s.provisions[0].monthlyNeeded)}/mois recommandé.</div>
        )}
      </Card>

      <Card title="Enveloppes en alerte" action={<button className="btn small ghost" onClick={() => go('budget')}>Gérer</button>}>
        {alertEnvelopes.length === 0 ? (
          <Empty text="Aucune enveloppe en alerte pour le moment." />
        ) : alertEnvelopes.map((e) => (
          <div className="env" key={e.id}>
            <div className="env-head"><div className="env-name"><span className={`dot ${e.state === 'depasse' ? 'danger' : 'warn'}`} />{e.name}</div><div className="env-fig">{e.usedPct} %</div></div>
            <Bar pct={e.usedPct} state={e.state} />
          </div>
        ))}
      </Card>

      {goals.length > 0 && (
        <Card title="Objectif principal" action={<button className="btn small ghost" onClick={() => go('objectifs')}>Voir</button>}>
          <div className="env-head"><div className="env-name">{goals[0].name}</div><div className="env-fig">{goals[0].progressPct} %</div></div>
          <Bar pct={goals[0].progressPct} />
          <div className="tiny mt">Effort recommandé : {money(goals[0].monthlyNeeded)}/mois.</div>
        </Card>
      )}

      <Card title="Score de discipline" action={<button className="btn small ghost" onClick={() => go('rapport')}>Détail</button>}>
        <div className="score-head">
          <div className="score-value">{s.score.measurable ? s.score.value : '--'}</div>
          <div><div className="score-band">{s.score.label}</div><div className="tiny">{s.score.measurable ? 'sur 100 points' : 'pas encore assez de données'}</div></div>
        </div>
      </Card>

      <Card title="Cette semaine">
        <div className="rows">
          <Row k="Dépenses de la semaine" v={<Money value={week.spent} />} />
          <Row k="Rythme prévu" v={<Money value={week.expectedPace} />} note={week.gap > 0 ? `Écart : +${money(week.gap)}` : 'Dans le rythme'} tone={week.gap > 0 ? 'neg' : 'pos'} />
        </div>
        <div className="banner mt"><span className={`dot ${week.willHold ? 'ok' : 'warn'}`} />{week.verdict}</div>
      </Card>
    </>
  )
}
