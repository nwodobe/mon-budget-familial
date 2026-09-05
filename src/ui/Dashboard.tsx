import { dateLabel, monthLabel } from '../domain/dates'
import { cumulativeDailySpend, spendByEnvelope } from '../domain/analytics'
import { currencyMeta } from '../domain/currency'
import { computeWeek, type MonthSnapshot } from '../domain/engine'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Bar, Card, Empty, Icon, Money, Row, StatCard, useMoneyText } from './common'
import { EnvelopeVisual, SpendDonut, SpendPaceChart } from './visuals'

export default function Dashboard({ go, onAdd }: { go: (screen: string) => void; onAdd: () => void }) {
  const { t, language } = useI18n()
  const { snapshot: s, ledger, goals, today, month } = useApp()
  const money = useMoneyText()
  const week = computeWeek(ledger, s as unknown as MonthSnapshot, today)
  const nextCharge = s.charges.find((c) => !c.paid)
  const alertEnvelopes = s.envelopes.filter((e) => e.state !== 'sain').slice(0, 3)
  const hasWatchItems = Boolean(nextCharge?.late || alertEnvelopes.length || s.todayOverBy > 0 || s.deficit > 0)
  const pace = cumulativeDailySpend(ledger, month, s.todayBudget)
  const categories = spendByEnvelope(ledger, month)
  const currency = currencyMeta(ledger.settings.currency)
  const healthLabel = s.health === 'saine' ? t('dashboard.healthHealthy') : s.health === 'attention' ? t('dashboard.healthWatch') : t('dashboard.healthDanger')
  const currencySymbol = ledger.settings.currency === 'XOF' && language === 'en' ? 'XOF' : currency.symbol

  return <>
    <section className={`hero-card ${s.health === 'danger' ? 'danger' : s.health === 'attention' ? 'warning' : ''}`}>
      <div className="hero-topline"><span>{t('dashboard.safeToSpend')}</span><span className="hero-status"><span className={`dot ${s.health === 'saine' ? 'ok' : s.health === 'attention' ? 'warn' : 'danger'}`} />{healthLabel}</span></div>
      <div className="hero-money"><Money value={s.spendable} currency={false} /><span>{currencySymbol}</span></div>
      <p>{s.deficit > 0 ? <strong>{t('dashboard.deficit', { amount: money(s.deficit) })}</strong> : t('dashboard.safeExplanation')}</p>
    </section>

    <section className="today-section">
      <div className="section-title-row"><div><span className="eyebrow dark">{t('dashboard.today')}</span><h2>{t('dashboard.todayMargin')}</h2></div></div>
      <div className="stats-grid">
        <StatCard label={t('dashboard.budget')} value={<Money value={s.todayBudget} currency={false}/>} />
        <StatCard label={t('dashboard.spent')} value={<Money value={s.todaySpent} currency={false}/>} tone={s.todayOverBy > 0 ? 'danger' : 'neutral'} />
        <StatCard label={s.todayOverBy > 0 ? t('dashboard.over') : t('dashboard.remaining')} value={<Money value={s.todayOverBy > 0 ? s.todayOverBy : s.todayRemaining} currency={false}/>} tone={s.todayOverBy > 0 ? 'danger' : 'positive'} />
      </div>
      <div className="stats-currency">{t('dashboard.amountsIn', { currency: ledger.settings.currency })}</div>
    </section>

    <div className="quick-actions">
      <button onClick={onAdd}><span><Icon name="plus"/></span>{t('dashboard.expense')}</button>
      <button onClick={() => go('revenus')}><span><Icon name="income"/></span>{t('dashboard.income')}</button>
      <button onClick={() => go('epargne')}><span><Icon name="savings"/></span>{t('dashboard.savings')}</button>
    </div>

    <Card title={t('dashboard.monthSpend')}><SpendPaceChart data={pace} /></Card>
    <Card title={t('dashboard.whereMoneyGoes')}><SpendDonut rows={categories} /></Card>
    <Card title={t('dashboard.envelopeBudget')} action={<button className="text-action" onClick={() => go('budget')}>{t('common.manage')}</button>}><EnvelopeVisual rows={categories} /></Card>

    {hasWatchItems && <Card title={t('dashboard.watch')} className="watch-card">
      {s.deficit > 0 && <div className="watch-item danger"><span className="watch-icon"><Icon name="alert" size={19}/></span><div><strong>{t('dashboard.deficitTitle')}</strong><small>{t('dashboard.deficitMissing', { amount: money(s.deficit) })}</small></div></div>}
      {s.todayOverBy > 0 && <div className="watch-item warning"><span className="watch-icon"><Icon name="alert" size={19}/></span><div><strong>{t('dashboard.dailyOverTitle')}</strong><small>{t('dashboard.dailyOverBody', { amount: money(s.todayOverBy) })}</small></div></div>}
      {nextCharge?.late && <div className="watch-item danger"><span className="watch-icon"><Icon name="charges" size={19}/></span><div><strong>{t('dashboard.lateBill', { label: nextCharge.label })}</strong><small>{t('dashboard.lateBillBody', { amount: money(nextCharge.amount), date: dateLabel(nextCharge.dueDate) })}</small></div></div>}
      {alertEnvelopes.map((e) => <div className={`watch-item ${e.state === 'depasse' ? 'danger' : 'warning'}`} key={e.id}><span className="watch-icon"><Icon name="wallet" size={19}/></span><div><strong>{e.name} · {e.usedPct}%</strong><small>{e.state === 'depasse' ? t('dashboard.envelopeOver', { amount: money(Math.abs(e.remaining)) }) : t('dashboard.envelopeLeft', { amount: money(e.remaining) })}</small></div></div>)}
    </Card>}

    <Card title={t('dashboard.overview', { month: monthLabel(month) })}>
      <div className="rows compact">
        <Row k={t('dashboard.receivedIncome')} v={<Money value={s.income}/>} tone="pos" />
        {s.incomeExpected > 0 && <Row k={t('dashboard.expectedIncome')} v={<Money value={s.incomeExpected}/>} note={t('dashboard.expectedIncomeNote')} />}
        <Row k={t('dashboard.remainingBills')} v={<Money value={s.chargesRemaining}/>} />
        <Row k={t('dashboard.savingsDone')} v={<Money value={s.savingsDone}/>} tone="pos" />
      </div>
    </Card>

    {nextCharge && <Card title={t('dashboard.nextBill')} action={<button className="text-action" onClick={() => go('charges')}>{t('common.seeAll')}</button>}>
      <button className="next-charge" onClick={() => go('charges')}><span className="charge-icon"><Icon name="charges"/></span><span className="charge-copy"><strong>{nextCharge.label}</strong><small>{t('dashboard.due', { date: dateLabel(nextCharge.dueDate) })}{nextCharge.late ? ` · ${t('dashboard.late')}` : ''}</small></span><span className="charge-amount"><Money value={nextCharge.amount}/></span><Icon name="chevronRight" size={18}/></button>
    </Card>}

    <Card title={t('dashboard.envelopes')} action={<button className="text-action" onClick={() => go('budget')}>{t('common.manage')}</button>}>
      {s.envelopes.length === 0 ? <Empty text={t('dashboard.noEnvelopes')} /> : s.envelopes.slice(0, 4).map((e) => <div className="env premium-env" key={e.id}><div className="env-head"><div className="env-name">{e.name}</div><div className={`env-fig ${e.state}`}>{e.usedPct}%</div></div><Bar pct={e.usedPct} state={e.state}/><div className="env-sub"><span><Money value={e.spent}/> {t('dashboard.spentSuffix')}</span><span>{e.remaining >= 0 ? t('dashboard.leftPrefix') : t('dashboard.overPrefix')}<Money value={Math.abs(e.remaining)}/></span></div></div>)}
    </Card>

    <div className="dashboard-two-col">
      <Card title={t('dashboard.disciplineScore')} action={<button className="text-action" onClick={() => go('rapport')}>{t('common.details')}</button>}>
        <div className="score-premium"><div className="score-ring"><span>{s.score.measurable ? s.score.value : '--'}</span><small>/100</small></div><div><strong>{s.score.measurable ? (s.score.value >= 75 ? t('dashboard.healthHealthy') : s.score.value >= 50 ? t('dashboard.healthWatch') : t('dashboard.healthDanger')) : '--'}</strong><p>{s.score.measurable ? t('dashboard.disciplineBody') : t('dashboard.disciplineEmpty')}</p></div></div>
      </Card>
      <Card title={t('dashboard.thisWeek')}><div className="rows compact"><Row k={t('dashboard.weekExpenses')} v={<Money value={week.spent}/>} /><Row k={t('dashboard.expectedPace')} v={<Money value={week.expectedPace}/>} tone={week.gap > 0 ? 'neg' : 'pos'} /></div><div className={`week-verdict ${week.willHold ? 'ok' : 'warn'}`}><Icon name={week.willHold ? 'check' : 'alert'} size={18}/>{week.willHold ? t('dashboard.weekOnTrack') : t('dashboard.weekTooFast')}</div></Card>
    </div>

    {(s.provisions.length > 0 || goals.length > 0) && <Card title={t('dashboard.projects')}>
      {s.provisions.length > 0 && <button className="project-row" onClick={() => go('preparer')}><span className="menu-icon"><Icon name="prepare"/></span><span><strong>{s.provisions[0].name}</strong><small>{t('dashboard.monthlyRecommended', { amount: money(s.provisions[0].monthlyNeeded) })}</small></span><Icon name="chevronRight" size={18}/></button>}
      {goals.length > 0 && <button className="project-row" onClick={() => go('objectifs')}><span className="menu-icon"><Icon name="target"/></span><span><strong>{goals[0].name}</strong><small>{t('dashboard.progressReached', { pct: goals[0].progressPct })}</small></span><Icon name="chevronRight" size={18}/></button>}
    </Card>}
  </>
}
