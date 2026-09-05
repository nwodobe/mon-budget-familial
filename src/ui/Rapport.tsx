import { monthLabel, shiftMonth } from '../domain/dates'
import { monthlyTrends } from '../domain/analytics'
import { computeMonthlyReport, computeWeek, type MonthSnapshot } from '../domain/engine'
import { download, monthlyReportToText, expensesToCsv } from '../data/exporter'
import { scoreText, useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Money, Row } from './common'
import { MonthlyBars } from './visuals'

export default function Rapport() {
  const { language, t } = useI18n()
  const { ledger, snapshot, month, today } = useApp()
  const previous = shiftMonth(month, -1)
  const legacyReport = computeMonthlyReport(ledger, month, previous, today)
  const week = computeWeek(ledger, snapshot as unknown as MonthSnapshot, today)
  const savingsRatePct = snapshot.income > 0 ? Math.round((snapshot.savingsDone / snapshot.income) * 100) : 0
  const trends = monthlyTrends(ledger, month, 6)
  const healthText = snapshot.health === 'saine' ? t('dashboard.healthHealthy') : snapshot.health === 'attention' ? t('dashboard.healthWatch') : t('dashboard.healthDanger')

  return <>
    <Card title={t('report.score')}>
      <div className="score-head"><div className="score-value">{snapshot.score.measurable ? snapshot.score.value : '--'}</div><div><div className="score-band">{snapshot.score.measurable ? healthText : '--'}</div><div className="tiny">{snapshot.score.measurable ? t('report.outOf100') : t('report.noData')}</div></div></div>
      {snapshot.score.measurable && <div className="mt" style={{ marginBottom: 14 }}><Bar pct={snapshot.score.value} state={snapshot.score.value >= 75 ? 'sain' : snapshot.score.value >= 50 ? 'attention' : 'depasse'} /></div>}
      {snapshot.score.components.map((component) => <div className={`score-comp ${component.applicable ? '' : 'na'}`} key={component.key}><div className="score-comp-head"><span>{scoreText(language, component.key, 'label', component.label)}</span><span>{component.applicable ? `${component.earned} / ${component.max}` : t('report.notApplicable')}</span></div><div className="detail">{scoreText(language, component.key, 'detail', component.detail)}</div><div className="tiny mt">{t('report.advice', { advice: scoreText(language, component.key, 'advice', component.advice) })}</div></div>)}
    </Card>

    <Card title={t('report.sixMonths')}><MonthlyBars rows={trends} /></Card>
    <Card title={t('report.week')}><div className="rows"><Row k={t('report.weekExpenses')} v={<Money value={week.spent} />} /><Row k={t('report.expectedPace')} v={<Money value={week.expectedPace} />} /><Row k={t('report.gap')} v={<Money value={week.gap} />} tone={week.gap > 0 ? 'neg' : 'pos'} /><Row k={t('report.weekSavings')} v={<Money value={week.savings} />} tone="pos" /></div><div className="banner mt"><span className={`dot ${week.willHold ? 'ok' : 'warn'}`} />{week.willHold ? t('dashboard.weekOnTrack') : t('dashboard.weekTooFast')}</div></Card>

    <Card title={t('report.month', { month: monthLabel(month) })}>
      <div className="rows"><Row k={t('dashboard.receivedIncome')} v={<Money value={snapshot.income} />} tone="pos" />{snapshot.incomeExpected > 0 && <Row k={t('report.expectedIncome')} v={<Money value={snapshot.incomeExpected} />} note={t('report.expectedNote')} />}<Row k={t('budget.mandatoryBills')} v={<Money value={snapshot.chargesDue} />} /><Row k={t('report.totalExpenses')} v={<Money value={snapshot.spent} />} tone="neg" /><Row k={t('report.savings')} v={<Money value={snapshot.savingsDone} />} tone="pos" /><Row k={t('report.savingsRate')} v={`${savingsRatePct}%`} /><Row k={t('report.safeToSpend')} v={<Money value={snapshot.spendable} />} tone={snapshot.deficit > 0 ? 'neg' : 'pos'} />{snapshot.deficit > 0 && <Row k={t('expense.deficit')} v={<Money value={snapshot.deficit} />} tone="neg" />}</div>
      {legacyReport.previous && <><div className="tiny mt" style={{ marginBottom: 6 }}>{t('report.compare', { month: monthLabel(previous) })}</div><div className="rows"><Row k={t('report.income')} v={<Money value={legacyReport.previous.income} />} /><Row k={t('report.expenses')} v={<Money value={legacyReport.previous.expenses} />} /><Row k={t('report.savingsRate')} v={`${legacyReport.previous.savingsRatePct}%`} /></div></>}
      {legacyReport.overspentEnvelopes.length > 0 && <><div className="tiny mt" style={{ marginBottom: 6 }}>{t('report.overEnvelopes')}</div><div className="list">{legacyReport.overspentEnvelopes.map((envelope) => <div className="item" key={envelope.name}><div className="main"><div className="title">{envelope.name}</div></div><div className="amt" style={{ color: 'var(--danger)' }}>+<Money value={envelope.over} /></div></div>)}</div></>}
      <div className="banner mt"><span className={`dot ${snapshot.health === 'danger' ? 'danger' : snapshot.health === 'attention' ? 'warn' : 'ok'}`} />{healthText}</div>
      <div className="btn-row mt"><button className="btn" onClick={() => download(`report-${month}.txt`, monthlyReportToText(ledger, month, previous, today), 'text/plain')}>{t('report.text')}</button><button className="btn" onClick={() => download(`expenses-${month}.csv`, expensesToCsv(ledger, month), 'text/csv')}>{t('report.csv')}</button></div>
    </Card>
    {snapshot.income === 0 && snapshot.spent === 0 && <Empty text={t('report.empty')} />}
  </>
}
