import { useMemo, useState } from 'react'
import { dateLabel, monthLabel, startOfWeek, todayIso } from '../domain/dates'
import { PAYMENT_METHODS } from '../domain/types'
import { paymentLabel, useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { Card, Empty, Field, Icon, Money } from './common'

type Period = 'jour' | 'semaine' | 'mois' | 'precedent' | 'annee'

export default function Historique() {
  const { language, t } = useI18n()
  const { ledger, snapshot, month, remove } = useApp()
  const [period, setPeriod] = useState<Period>('mois')
  const [envelopeId, setEnvelopeId] = useState('')
  const [method, setMethod] = useState('')
  const [member, setMember] = useState('')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const today = todayIso()
  const periods: { value: Period; label: string }[] = [
    { value: 'jour', label: t('history.today') }, { value: 'semaine', label: t('history.thisWeek') }, { value: 'mois', label: t('history.thisMonth') }, { value: 'precedent', label: t('history.previousMonth') }, { value: 'annee', label: t('history.year') },
  ]

  const range = useMemo<{ from: string; to: string; label: string }>(() => {
    switch (period) {
      case 'jour': return { from: today, to: today, label: dateLabel(today) }
      case 'semaine': return { from: startOfWeek(today), to: today, label: t('history.since', { date: dateLabel(startOfWeek(today)) }) }
      case 'mois': return { from: `${month}-01`, to: `${month}-31`, label: monthLabel(month) }
      case 'precedent': { const [year, numericMonth] = month.split('-').map(Number); const date = new Date(year, numericMonth - 2, 1); const previous = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; return { from: `${previous}-01`, to: `${previous}-31`, label: monthLabel(previous) } }
      case 'annee': { const year = month.slice(0, 4); return { from: `${year}-01-01`, to: `${year}-12-31`, label: t('history.yearLabel', { year }) } }
    }
  }, [period, month, today, t])

  const rows = ledger.expenses.filter((expense) => expense.deleted_at === null).filter((expense) => expense.date >= range.from && expense.date <= range.to).filter((expense) => envelopeId ? expense.envelope_id === envelopeId : true).filter((expense) => method ? expense.method === method : true).filter((expense) => member ? expense.member === member : true).filter((expense) => search.trim() === '' ? true : (expense.description + ' ' + expense.override_reason).toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => b.date === a.date ? b.updated_at.localeCompare(a.updated_at) : b.date.localeCompare(a.date))
  const total = rows.reduce((sum, expense) => sum + expense.amount, 0)
  const envelopeName = (id: string | null) => id ? (snapshot.envelopes.find((envelope) => envelope.id === id)?.name ?? t('history.deletedEnvelope')) : t('history.outsideEnvelope')
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, item) => { const label = item.date === today ? t('history.today') : item.date === previousDay(today) ? t('history.yesterday') : dateLabel(item.date); (acc[label] ??= []).push(item); return acc }, {})
  const filterCount = [envelopeId, method, member].filter(Boolean).length

  return <>
    <section className="activity-summary"><div><span>{t('history.outflows', { period: range.label })}</span><strong><Money value={total}/></strong><small>{rows.length} {rows.length === 1 ? t('history.expense') : t('history.expenses')}</small></div></section>
    <div className="period-scroll" aria-label={t('history.period')}>{periods.map((row) => <button key={row.value} className={`period-pill ${period === row.value ? 'on' : ''}`} onClick={() => setPeriod(row.value)}>{row.label}</button>)}</div>
    <div className="activity-tools"><label className="search-box"><Icon name="search" size={19}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('history.searchExpense')} aria-label={t('history.searchExpense')} /></label><button className={`filter-button ${filterCount ? 'active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}>{t('history.filters')}{filterCount ? ` (${filterCount})` : ''}</button></div>
    {filtersOpen && <Card className="filters-card"><div className="field-2"><Field label={t('history.envelope')}><select value={envelopeId} onChange={(event) => setEnvelopeId(event.target.value)}><option value="">{t('common.all')}</option>{snapshot.envelopes.map((envelope) => <option key={envelope.id} value={envelope.id}>{envelope.name}</option>)}</select></Field><Field label={t('history.method')}><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="">{t('common.allMasc')}</option>{PAYMENT_METHODS.map((row) => <option key={row.value} value={row.value}>{paymentLabel(language, row.value)}</option>)}</select></Field></div>{ledger.settings.members.length > 1 && <Field label={t('history.person')}><select value={member} onChange={(event) => setMember(event.target.value)}><option value="">{t('common.all')}</option>{ledger.settings.members.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>}{filterCount > 0 && <button className="text-action" onClick={() => { setEnvelopeId(''); setMethod(''); setMember('') }}>{t('history.resetFilters')}</button>}</Card>}
    {rows.length === 0 ? <Card><Empty text={t('history.empty')} /></Card> : <div className="transaction-groups">{Object.entries(grouped).map(([label, items]) => <section className="transaction-group" key={label}><h2>{label}</h2><div className="transaction-list">{items.map((expense) => <div className="transaction-row" key={expense.id}><span className="transaction-icon"><Icon name="receipt" size={20}/></span><div className="transaction-main"><strong>{expense.description || envelopeName(expense.envelope_id)}</strong><small>{envelopeName(expense.envelope_id)} · {paymentLabel(language, expense.method)}{expense.member ? ` · ${expense.member}` : ''}</small></div><div className="transaction-end"><strong>-<Money value={expense.amount}/></strong><button onClick={() => remove('expenses', expense.id)} aria-label={`${t('common.remove')} ${expense.description || envelopeName(expense.envelope_id)}`}>{t('common.remove')}</button></div></div>)}</div></section>)}</div>}
  </>
}

function previousDay(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
