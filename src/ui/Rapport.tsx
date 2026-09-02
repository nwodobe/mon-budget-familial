import { monthLabel, shiftMonth } from '../domain/dates'
import { computeMonthlyReport, computeWeek, type MonthSnapshot } from '../domain/engine'
import { download, monthlyReportToText, expensesToCsv } from '../data/exporter'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Money, Row } from './common'

export default function Rapport() {
  const { ledger, snapshot, month, today } = useApp()
  const previous = shiftMonth(month, -1)
  const legacyReport = computeMonthlyReport(ledger, month, previous, today)
  const week = computeWeek(ledger, snapshot as unknown as MonthSnapshot, today)
  const savingsRatePct = snapshot.income > 0 ? Math.round((snapshot.savingsDone / snapshot.income) * 100) : 0

  return (
    <>
      <Card title="Score de discipline">
        <div className="score-head">
          <div className="score-value">{snapshot.score.measurable ? snapshot.score.value : '--'}</div>
          <div>
            <div className="score-band">{snapshot.score.label}</div>
            <div className="tiny">{snapshot.score.measurable ? 'sur 100 points' : 'aucune donnée à noter ce mois'}</div>
          </div>
        </div>
        {snapshot.score.measurable && (
          <div className="mt" style={{ marginBottom: 14 }}>
            <Bar pct={snapshot.score.value} state={snapshot.score.value >= 75 ? 'sain' : snapshot.score.value >= 50 ? 'attention' : 'depasse'} />
          </div>
        )}
        {snapshot.score.components.map((c) => (
          <div className={`score-comp ${c.applicable ? '' : 'na'}`} key={c.key}>
            <div className="score-comp-head"><span>{c.label}</span><span>{c.applicable ? `${c.earned} / ${c.max}` : 'non applicable'}</span></div>
            <div className="detail">{c.detail}</div>
            <div className="tiny mt">Conseil : {c.advice}</div>
          </div>
        ))}
      </Card>

      <Card title="Rapport de la semaine">
        <div className="rows">
          <Row k="Dépenses de la semaine" v={<Money value={week.spent} />} />
          <Row k="Rythme prévu sur la période" v={<Money value={week.expectedPace} />} />
          <Row k="Écart" v={<Money value={week.gap} />} tone={week.gap > 0 ? 'neg' : 'pos'} />
          <Row k="Épargne de la semaine" v={<Money value={week.savings} />} tone="pos" />
        </div>
        <div className="banner mt"><span className={`dot ${week.willHold ? 'ok' : 'warn'}`} />{week.verdict}</div>
      </Card>

      <Card title={`Rapport mensuel - ${monthLabel(month)}`}>
        <div className="rows">
          <Row k="Revenus encaissés" v={<Money value={snapshot.income} />} tone="pos" />
          {snapshot.incomeExpected > 0 && <Row k="Revenus encore attendus" v={<Money value={snapshot.incomeExpected} />} note="Non inclus dans le Disponible" />}
          <Row k="Charges obligatoires" v={<Money value={snapshot.chargesDue} />} />
          <Row k="Dépenses totales" v={<Money value={snapshot.spent} />} tone="neg" />
          <Row k="Épargne" v={<Money value={snapshot.savingsDone} />} tone="pos" />
          <Row k="Taux d'épargne sur encaissé" v={`${savingsRatePct} %`} />
          <Row k="Disponible sûr" v={<Money value={snapshot.spendable} />} tone={snapshot.deficit > 0 ? 'neg' : 'pos'} />
          {snapshot.deficit > 0 && <Row k="Déficit à couvrir" v={<Money value={snapshot.deficit} />} tone="neg" />}
        </div>

        {legacyReport.previous && (
          <>
            <div className="tiny mt" style={{ marginBottom: 6 }}>Comparaison avec {monthLabel(previous)}</div>
            <div className="rows">
              <Row k="Revenus" v={<Money value={legacyReport.previous.income} />} />
              <Row k="Dépenses" v={<Money value={legacyReport.previous.expenses} />} />
              <Row k="Taux d'épargne" v={`${legacyReport.previous.savingsRatePct} %`} />
            </div>
          </>
        )}

        {legacyReport.overspentEnvelopes.length > 0 && (
          <>
            <div className="tiny mt" style={{ marginBottom: 6 }}>Enveloppes dépassées</div>
            <div className="list">
              {legacyReport.overspentEnvelopes.map((e) => (
                <div className="item" key={e.name}><div className="main"><div className="title">{e.name}</div></div><div className="amt" style={{ color: 'var(--danger)' }}>+<Money value={e.over} /></div></div>
              ))}
            </div>
          </>
        )}

        <div className="banner mt"><span className={`dot ${snapshot.health === 'danger' ? 'danger' : snapshot.health === 'attention' ? 'warn' : 'ok'}`} />{snapshot.healthReason}</div>

        <div className="btn-row mt">
          <button className="btn" onClick={() => download(`rapport-${month}.txt`, monthlyReportToText(ledger, month, previous, today), 'text/plain')}>Rapport en texte</button>
          <button className="btn" onClick={() => download(`depenses-${month}.csv`, expensesToCsv(ledger, month), 'text/csv')}>Dépenses en CSV</button>
        </div>
      </Card>

      {snapshot.income === 0 && snapshot.spent === 0 && <Empty text="Enregistrez un revenu encaissé et quelques dépenses : les rapports se remplissent tout seuls." />}
    </>
  )
}
