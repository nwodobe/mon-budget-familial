import type { CategorySpendPoint, DailySpendPoint, MonthlyTrendPoint } from '../domain/analytics'
import { formatMoneyCompact } from '../domain/currency'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Bar, Money } from './common'

function points(values: number[], width: number, height: number): string {
  const max = Math.max(1, ...values)
  return values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width
    const y = height - (value / max) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export function SpendPaceChart({ data }: { data: DailySpendPoint[] }) {
  const { ledger } = useApp()
  const { locale, t } = useI18n()
  if (data.length === 0 || data.every((d) => d.actual === 0)) return <div className="chart-empty">{t('visuals.addExpenses')}</div>
  const width = 320
  const height = 130
  const max = Math.max(1, ...data.flatMap((d) => [d.actual, d.advised]))
  const normalize = (key: 'actual' | 'advised') => data.map((d) => d[key] / max * max)
  const actual = points(normalize('actual'), width, height)
  const advised = points(normalize('advised'), width, height)
  const last = data[data.length - 1]
  const status = last.actual <= last.advised ? t('visuals.paceOk') : t('visuals.paceFast')
  return <div className="viz-wrap">
    <svg className="line-chart" viewBox={`0 0 ${width} ${height + 28}`} role="img" aria-label={`${t('visuals.actualExpenses')} ${formatMoneyCompact(last.actual, ledger.settings.currency, locale)}. ${t('visuals.advisedPace')} ${formatMoneyCompact(last.advised, ledger.settings.currency, locale)}.`}>
      <line x1="0" y1={height} x2={width} y2={height} className="chart-axis"/>
      <polyline points={advised} className="chart-line advised"/><polyline points={actual} className={`chart-line actual ${last.actual > last.advised ? 'danger' : 'ok'}`}/>
      <text x="0" y={height + 22} className="chart-label">1</text><text x={width - 18} y={height + 22} className="chart-label">{data.length}</text>
    </svg>
    <div className={`chart-verdict ${last.actual > last.advised ? 'danger' : 'ok'}`}>{status}</div>
    <div className="chart-legend"><span><i className="legend-dot actual"/>{t('visuals.actualExpenses')}</span><span><i className="legend-dot advised"/>{t('visuals.advisedPace')}</span></div>
  </div>
}

export function EnvelopeVisual({ rows }: { rows: CategorySpendPoint[] }) {
  const { t } = useI18n()
  if (rows.length === 0) return <div className="chart-empty">{t('visuals.envelopeEmpty')}</div>
  return <div className="envelope-bars">{rows.slice(0, 6).map((r) => <div className="env-visual" key={r.name}>
    <div className="env-visual-head"><strong>{r.name}</strong><span className={r.pct >= 100 ? 'danger-text' : r.pct >= 80 ? 'warn-text' : ''}>{r.pct}%</span></div>
    <Bar pct={r.pct} state={r.pct >= 100 ? 'depasse' : r.pct >= 80 ? 'attention' : 'sain'} />
    <div className="env-visual-foot"><span><Money value={r.spent}/> {t('dashboard.spentSuffix')}</span><span>{r.remaining >= 0 ? <>{t('dashboard.leftPrefix')}<Money value={r.remaining}/></> : <>{t('dashboard.overPrefix')}<Money value={Math.abs(r.remaining)}/></>}</span></div>
  </div>)}</div>
}

export function SpendDonut({ rows }: { rows: CategorySpendPoint[] }) {
  const { t } = useI18n()
  const total = rows.reduce((sum, row) => sum + row.spent, 0)
  if (total <= 0) return <div className="chart-empty">{t('visuals.categoriesEmpty')}</div>
  const ranked = rows.filter((r) => r.spent > 0).slice(0, 5)
  let offset = 0
  const segments = ranked.map((r, i) => {
    const pct = r.spent / total
    const dash = `${pct * 100} ${100 - pct * 100}`
    const item = <circle key={r.name} cx="60" cy="60" r="48" pathLength="100" className={`donut-segment seg-${i}`} strokeDasharray={dash} strokeDashoffset={-offset * 100}/>
    offset += pct
    return item
  })
  return <div className="donut-layout"><div className="donut-box"><svg viewBox="0 0 120 120" role="img" aria-label={ranked.map((r) => `${r.name} ${Math.round(r.spent / total * 100)}%`).join(', ')}><circle cx="60" cy="60" r="48" className="donut-bg"/>{segments}</svg><div className="donut-center"><strong><Money value={total}/></strong><small>{t('visuals.totalSpent')}</small></div></div><div className="donut-legend">{ranked.map((r, i) => <div key={r.name}><span className={`legend-chip seg-${i}`}/><span>{r.name}</span><strong>{Math.round(r.spent / total * 100)}%</strong></div>)}</div></div>
}

export function MonthlyBars({ rows }: { rows: MonthlyTrendPoint[] }) {
  const { ledger } = useApp()
  const { locale, t } = useI18n()
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expenses, Math.max(0, r.savings)]))
  return <div className="monthly-chart" role="img" aria-label={t('visuals.monthlyAria')}>
    <div className="monthly-columns">{rows.map((r) => <div className="month-group" key={r.month} title={`${r.month} — ${t('visuals.income')} ${formatMoneyCompact(r.income, ledger.settings.currency, locale)}, ${t('visuals.expenses')} ${formatMoneyCompact(r.expenses, ledger.settings.currency, locale)}, ${t('visuals.savings')} ${formatMoneyCompact(r.savings, ledger.settings.currency, locale)}`}>
      <div className="month-bars"><span className="mbar income" style={{ height: `${Math.max(3, r.income / max * 100)}%` }}/><span className="mbar expense" style={{ height: `${Math.max(3, r.expenses / max * 100)}%` }}/><span className="mbar saving" style={{ height: `${Math.max(3, Math.max(0, r.savings) / max * 100)}%` }}/></div><small>{r.month.slice(5)}</small>
    </div>)}</div>
    <div className="chart-legend"><span><i className="legend-dot income"/>{t('visuals.income')}</span><span><i className="legend-dot expense"/>{t('visuals.expenses')}</span><span><i className="legend-dot saving"/>{t('visuals.savings')}</span></div>
  </div>
}
