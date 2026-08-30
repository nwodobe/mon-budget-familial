import { monthLabel, shiftMonth } from '../domain/dates'
import { computeMonthlyReport, computeWeek } from '../domain/engine'
import { download, monthlyReportToText, expensesToCsv } from '../data/exporter'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Money, Row } from './common'

export default function Rapport() {
  const { ledger, snapshot, month, today } = useApp()
  const previous = shiftMonth(month, -1)
  const report = computeMonthlyReport(ledger, month, previous, today)
  const week = computeWeek(ledger, snapshot, today)

  return (
    <>
      <Card title="Score de discipline">
        <div className="score-head">
          <div className="score-value">{snapshot.score.measurable ? snapshot.score.value : '--'}</div>
          <div>
            <div className="score-band">{snapshot.score.label}</div>
            <div className="tiny">
              {snapshot.score.measurable ? 'sur 100 points' : 'aucune donnee a noter ce mois'}
            </div>
          </div>
        </div>
        {snapshot.score.measurable && (
          <div className="mt" style={{ marginBottom: 14 }}>
            <Bar
              pct={snapshot.score.value}
              state={snapshot.score.value >= 75 ? 'sain' : snapshot.score.value >= 50 ? 'attention' : 'depasse'}
            />
          </div>
        )}
        {snapshot.score.components.map((c) => (
          <div className={`score-comp ${c.applicable ? '' : 'na'}`} key={c.key}>
            <div className="score-comp-head">
              <span>{c.label}</span>
              <span>{c.applicable ? `${c.earned} / ${c.max}` : 'non applicable'}</span>
            </div>
            <div className="detail">{c.detail}</div>
          </div>
        ))}
        <div className="tiny mt">
          Les composantes sans matiere sont retirees du bareme au lieu d etre comptees comme reussies ou ratees.
        </div>
      </Card>

      <Card title="Rapport de la semaine">
        <div className="rows">
          <Row k="Depenses de la semaine" v={<Money value={week.spent} />} />
          <Row k="Rythme prevu sur la periode" v={<Money value={week.expectedPace} />} />
          <Row
            k="Ecart"
            v={<Money value={week.gap} />}
            tone={week.gap > 0 ? 'neg' : 'pos'}
          />
          <Row k="Epargne de la semaine" v={<Money value={week.savings} />} tone="pos" />
        </div>
        {week.topEnvelopes.length > 0 && (
          <>
            <div className="tiny mt" style={{ marginBottom: 6 }}>Trois premieres categories</div>
            <div className="list">
              {week.topEnvelopes.map((t) => (
                <div className="item" key={t.name}>
                  <div className="main">
                    <div className="title">{t.name}</div>
                  </div>
                  <div className="amt">
                    <Money value={t.amount} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="banner mt">
          <span className={`dot ${week.willHold ? 'ok' : 'warn'}`} />
          {week.verdict}
        </div>
      </Card>

      <Card title={`Rapport mensuel - ${monthLabel(month)}`}>
        <div className="rows">
          <Row k="Revenus" v={<Money value={report.income} />} tone="pos" />
          <Row k="Charges obligatoires" v={<Money value={report.charges} />} />
          <Row k="Depenses totales" v={<Money value={report.expenses} />} tone="neg" />
          <Row k="Epargne" v={<Money value={report.savings} />} tone="pos" />
          <Row k="Taux d epargne" v={`${report.savingsRatePct} %`} />
          <Row k="Solde final" v={<Money value={report.balance} />} tone={report.balance < 0 ? 'neg' : 'pos'} />
        </div>

        {report.previous && (
          <>
            <div className="tiny mt" style={{ marginBottom: 6 }}>Comparaison avec {monthLabel(previous)}</div>
            <div className="rows">
              <Row k="Revenus" v={<Money value={report.previous.income} />} />
              <Row k="Depenses" v={<Money value={report.previous.expenses} />} />
              <Row k="Taux d epargne" v={`${report.previous.savingsRatePct} %`} />
            </div>
          </>
        )}

        {report.overspentEnvelopes.length > 0 && (
          <>
            <div className="tiny mt" style={{ marginBottom: 6 }}>Enveloppes depassees</div>
            <div className="list">
              {report.overspentEnvelopes.map((e) => (
                <div className="item" key={e.name}>
                  <div className="main">
                    <div className="title">{e.name}</div>
                  </div>
                  <div className="amt" style={{ color: 'var(--danger)' }}>
                    +<Money value={e.over} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="banner mt">
          <span className="dot ok" />
          {report.conclusion}
        </div>

        <div className="btn-row mt">
          <button
            className="btn"
            onClick={() => download(`rapport-${month}.txt`, monthlyReportToText(ledger, month, previous), 'text/plain')}
          >
            Rapport en texte
          </button>
          <button
            className="btn"
            onClick={() => download(`depenses-${month}.csv`, expensesToCsv(ledger, month), 'text/csv')}
          >
            Depenses en CSV
          </button>
        </div>
      </Card>

      {snapshot.income === 0 && snapshot.spent === 0 && (
        <Empty text="Enregistrez un revenu et quelques depenses : les rapports se remplissent tout seuls." />
      )}
    </>
  )
}
