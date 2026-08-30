import { dateLabel, monthLabel } from '../domain/dates'
import { computeWeek } from '../domain/engine'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Money, Row, useMoneyText } from './common'

const DOT: Record<string, string> = { saine: 'ok', attention: 'warn', danger: 'danger' }
const HEALTH_LABEL: Record<string, string> = {
  saine: 'Situation saine',
  attention: 'Attention',
  danger: 'Budget en danger',
}

export default function Dashboard({ go }: { go: (screen: string) => void }) {
  const { snapshot: s, ledger, goals, today, month } = useApp()
  const money = useMoneyText()
  const week = computeWeek(ledger, s, today)
  const nextCharges = s.charges.filter((c) => !c.paid).slice(0, 3)

  return (
    <>
      <section className="card hero">
        <div className="label">Disponible a depenser</div>
        <div className={`amount ${s.available < 0 ? 'negative' : ''}`}>
          <Money value={s.available} currency={false} />
          <span className="currency">FCFA</span>
        </div>
        <div className="daily">
          {s.daysRemaining > 0 ? (
            <>
              Soit <strong><Money value={s.dailyBudget} /></strong> par jour sur {s.daysRemaining} jour
              {s.daysRemaining > 1 ? 's' : ''} restant{s.daysRemaining > 1 ? 's' : ''}
            </>
          ) : (
            <>Le mois de {monthLabel(month)} est termine</>
          )}
        </div>
        <div className="status">
          <span className={`dot ${DOT[s.health]}`} />
          {HEALTH_LABEL[s.health]}
        </div>
        <div className="status-reason">{s.healthReason}</div>
      </section>

      <Card title={`Le mois de ${monthLabel(month)}`}>
        <div className="rows">
          <Row k="Revenus du mois" v={<Money value={s.income} />} tone="pos" />
          <Row
            k="Charges obligatoires"
            v={<Money value={s.chargesDue} />}
            note={
              s.chargesRemaining > 0
                ? `Reste a payer : ${money(s.chargesRemaining)}`
                : 'Toutes reglees'
            }
          />
          <Row
            k="Epargne"
            v={<Money value={s.savingsDone} />}
            note={`Objectif du mois : ${money(s.savingsTarget)}`}
          />
          <Row k="Depenses enregistrees" v={<Money value={s.spent} />} tone="neg" />
          <Row k="Rythme observe" v={<><Money value={s.averageDailySpend} />/j</>} note={`${s.daysElapsed} jour(s) ecoule(s)`} />
        </div>
      </Card>

      <Card
        title="Score de discipline"
        action={
          <button className="btn small ghost" onClick={() => go('rapport')}>
            Detail
          </button>
        }
      >
        <div className="score-head">
          <div className="score-value">{s.score.measurable ? s.score.value : '--'}</div>
          <div>
            <div className="score-band">{s.score.label}</div>
            <div className="tiny">{s.score.measurable ? 'sur 100 points' : 'aucune donnee a noter ce mois'}</div>
          </div>
        </div>
        {s.score.measurable && (
          <div style={{ marginTop: 12 }}>
            <Bar
              pct={s.score.value}
              state={s.score.value >= 75 ? 'sain' : s.score.value >= 50 ? 'attention' : 'depasse'}
            />
          </div>
        )}
      </Card>

      <Card
        title="Enveloppes"
        action={
          <button className="btn small ghost" onClick={() => go('budget')}>
            Gerer
          </button>
        }
      >
        {s.envelopes.length === 0 ? (
          <Empty text="Aucune enveloppe. Definissez vos categories de depense pour piloter votre mois." />
        ) : (
          s.envelopes.slice(0, 5).map((e) => (
            <div className="env" key={e.id}>
              <div className="env-head">
                <div className="env-name">
                  <span className={`dot ${e.state === 'depasse' ? 'danger' : e.state === 'attention' ? 'warn' : 'ok'}`} />
                  {e.name}
                </div>
                <div className="env-fig">{e.usedPct} %</div>
              </div>
              <Bar pct={e.usedPct} state={e.state} />
              <div className="env-sub">
                <span>
                  <Money value={e.spent} currency={false} /> / <Money value={e.planned} />
                </span>
                <span>
                  {e.remaining >= 0 ? 'Reste ' : 'Depassement '}
                  <Money value={Math.abs(e.remaining)} />
                </span>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card
        title="Prochaines charges"
        action={
          <button className="btn small ghost" onClick={() => go('charges')}>
            Voir
          </button>
        }
      >
        {nextCharges.length === 0 ? (
          <Empty text="Aucune charge en attente de reglement ce mois." />
        ) : (
          <div className="list">
            {nextCharges.map((c) => (
              <div className="item" key={c.id}>
                <div className="main">
                  <div className="title">
                    {c.late && <span className="dot danger" style={{ display: 'inline-block', marginRight: 6 }} />}
                    {c.label}
                  </div>
                  <div className="meta">
                    Echeance {dateLabel(c.dueDate)}
                    {c.late ? ' - en retard' : ''}
                  </div>
                </div>
                <div className="amt">
                  <Money value={c.amount} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Cette semaine">
        <div className="rows">
          <Row k="Depenses de la semaine" v={<Money value={week.spent} />} />
          <Row
            k="Rythme prevu"
            v={<Money value={week.expectedPace} />}
            note={week.gap > 0 ? `Ecart : +${money(week.gap)}` : 'Dans le rythme'}
            tone={week.gap > 0 ? 'neg' : 'pos'}
          />
        </div>
        <div className="banner mt" style={{ borderColor: week.willHold ? undefined : 'var(--warn)' }}>
          <span className={`dot ${week.willHold ? 'ok' : 'warn'}`} />
          {week.verdict}
        </div>
      </Card>

      {goals.length > 0 && (
        <Card
          title="Objectifs"
          action={
            <button className="btn small ghost" onClick={() => go('objectifs')}>
              Voir
            </button>
          }
        >
          {goals.slice(0, 3).map((g) => (
            <div className="env" key={g.id}>
              <div className="env-head">
                <div className="env-name">{g.name}</div>
                <div className="env-fig">{g.progressPct} %</div>
              </div>
              <Bar pct={g.progressPct} />
              <div className="env-sub">
                <span>
                  <Money value={g.saved} currency={false} /> / <Money value={g.target} />
                </span>
                <span>
                  {g.monthsLeft > 0 ? (
                    <>
                      <Money value={g.monthlyNeeded} />
                      /mois
                    </>
                  ) : (
                    'Echeance atteinte'
                  )}
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}
