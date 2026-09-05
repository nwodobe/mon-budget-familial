import { useState } from 'react'
import { dateLabel, monthLabel } from '../domain/dates'
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/types'
import { paymentLabel, useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Card, Empty, Field, Money, Row, Sheet, useMoneyText } from './common'

const SOURCE_KEYS = ['salary', 'business', 'rent', 'bonus', 'partner', 'other'] as const
const SOURCES_FR: Record<(typeof SOURCE_KEYS)[number], string> = { salary: 'Salaire', business: 'Business', rent: 'Location', bonus: 'Prime', partner: 'Revenus du conjoint', other: 'Autre' }
const SOURCES_EN: Record<(typeof SOURCE_KEYS)[number], string> = { salary: 'Salary', business: 'Business', rent: 'Rental income', bonus: 'Bonus', partner: 'Partner income', other: 'Other' }

export default function Revenus() {
  const { language, t } = useI18n()
  const { ledger, month, snapshot, create, remove, today } = useApp()
  const [adding, setAdding] = useState(false)
  const rows = ledger.incomes.filter((income) => income.deleted_at === null && income.date.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date))

  return <>
    <Card title={t('income.month', { month: monthLabel(month) })} action={<button className="btn small ghost" onClick={() => setAdding(true)}>{t('common.add')}</button>}>
      <div className="rows"><Row k={t('income.received')} v={<Money value={snapshot.income} />} tone="pos" note={t('income.receivedNote')} /><Row k={t('income.expected')} v={<Money value={snapshot.incomeExpected} />} note={t('income.expectedNote')} /><Row k={t('income.planned')} v={<Money value={snapshot.incomePlanned} />} /><Row k={t('income.savingsTarget')} v={<Money value={snapshot.savingsTarget} />} note={t('income.savingsTargetNote', { pct: ledger.settings.savings_rate_pct })} /></div>
    </Card>
    <Card title={t('income.detail')}>
      {rows.length === 0 ? <Empty text={t('income.empty')} /> : <div className="list">{rows.map((income) => {
        const expected = income.date > today
        return <div className="item" key={income.id}><div className="main"><div className="title"><span className={`dot ${expected ? 'warn' : 'ok'}`} style={{ display: 'inline-block', marginRight: 7 }} />{income.source}</div><div className="meta">{expected ? t('income.expectedState') : t('income.receivedState')} - {dateLabel(income.date)} - {paymentLabel(language, income.method)}{income.recurring ? ` - ${t('income.recurring')}` : ''}{income.note ? ` - ${income.note}` : ''}</div></div><div className="amt"><Money value={income.amount} /></div><button className="btn small ghost" onClick={() => remove('incomes', income.id)}>{t('common.remove')}</button></div>
      })}</div>}
    </Card>
    {adding && <IncomeSheet onClose={() => setAdding(false)} onSave={(row) => { create('incomes', row); setAdding(false) }} />}
  </>
}

function IncomeSheet({ onClose, onSave }: { onClose: () => void; onSave: (row: { date: string; amount: number; source: string; method: PaymentMethod; recurring: boolean; note: string }) => void }) {
  const { language, t } = useI18n()
  const money = useMoneyText()
  const { today, ledger } = useApp()
  const sourceLabels = language === 'fr' ? SOURCES_FR : SOURCES_EN
  const [amount, setAmount] = useState(0)
  const [sourceKey, setSourceKey] = useState<(typeof SOURCE_KEYS)[number]>('salary')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('banque')
  const [recurring, setRecurring] = useState(true)
  const [note, setNote] = useState('')
  const reserved = Math.round((amount * ledger.settings.savings_rate_pct) / 100)
  const future = date > today
  return <Sheet title={t('income.add')} onClose={onClose}>
    <Field label={t('income.amount')}><AmountInput value={amount} onChange={setAmount} autoFocus /></Field>
    {amount > 0 && <div className="banner mt" style={{ marginBottom: 13 }}><span className={`dot ${future ? 'warn' : 'ok'}`} />{future ? t('income.futureWarning', { date: dateLabel(date) }) : t('income.savingsRecommendation', { reserved: money(reserved), after: money(amount - reserved) })}</div>}
    <Field label={t('income.source')}><select value={sourceKey} onChange={(event) => setSourceKey(event.target.value as (typeof SOURCE_KEYS)[number])}>{SOURCE_KEYS.map((key) => <option key={key} value={key}>{sourceLabels[key]}</option>)}</select></Field>
    <div className="field-2"><Field label={t('income.date')}><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label={t('income.method')}><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((row) => <option key={row.value} value={row.value}>{paymentLabel(language, row.value)}</option>)}</select></Field></div>
    <Field label={t('income.comment')}><input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    <div className="chips" style={{ marginBottom: 14 }}><button className={`chip ${recurring ? 'on' : ''}`} onClick={() => setRecurring(true)}>{t('income.recurringChoice')}</button><button className={`chip ${!recurring ? 'on' : ''}`} onClick={() => setRecurring(false)}>{t('income.oneOff')}</button></div>
    <button className="btn primary" disabled={amount <= 0} onClick={() => onSave({ date, amount, source: sourceLabels[sourceKey], method, recurring, note: note.trim() })}>{t('income.save')}</button>
  </Sheet>
}
