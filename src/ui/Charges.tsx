import { useState } from 'react'
import { dateLabel, monthLabel } from '../domain/dates'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Card, Empty, Field, Money, Row, Sheet } from './common'
import type { ChargeFrequency } from '../domain/types'

const SUGGESTIONS_FR = ['Loyer', 'Scolarité', 'Électricité', 'Eau', 'Internet', 'Canal+', 'Assurance', 'Crédit', 'Salaire domestique']
const SUGGESTIONS_EN = ['Rent', 'School fees', 'Electricity', 'Water', 'Internet', 'TV subscription', 'Insurance', 'Loan', 'Household help']

export default function Charges() {
  const { language, t } = useI18n()
  const { snapshot, ledger, month, today, create, update, remove } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const suggestions = language === 'fr' ? SUGGESTIONS_FR : SUGGESTIONS_EN

  function pay(chargeId: string, amount: number) {
    const charge = ledger.charges.find((row) => row.id === chargeId)
    const expenseId = create('expenses', { date: today, amount, envelope_id: null, method: 'banque', description: language === 'fr' ? `Règlement ${charge?.label ?? 'charge'}` : `Payment ${charge?.label ?? 'bill'}`, member: ledger.settings.members[0] ?? (language === 'fr' ? 'Moi' : 'Me'), charge_id: chargeId, override_reason: '' })
    create('charge_payments', { charge_id: chargeId, month, paid_date: today, amount, expense_id: expenseId })
  }

  function cancelPayment(chargeId: string) {
    const payment = ledger.charge_payments.find((row) => row.charge_id === chargeId && row.month === month && row.deleted_at === null)
    if (!payment) return
    if (payment.expense_id) remove('expenses', payment.expense_id)
    remove('charge_payments', payment.id)
  }

  const inactive = ledger.charges.filter((charge) => charge.deleted_at === null && !snapshot.charges.some((row) => row.id === charge.id))
  const frequencyLabel = (frequency: ChargeFrequency) => t(`bills.frequency.${frequency === 'mensuelle' ? 'monthly' : frequency === 'trimestrielle' ? 'quarterly' : frequency === 'annuelle' ? 'yearly' : 'once'}`)

  return <>
    <Card title={t('bills.monthTitle', { month: monthLabel(month) })} action={<button className="btn small ghost" onClick={() => setAdding(true)}>{t('common.add')}</button>}>
      <div className="rows"><Row k={t('bills.totalMonth')} v={<Money value={snapshot.chargesDue} />} /><Row k={t('bills.paid')} v={<Money value={snapshot.chargesPaid} />} tone="pos" /><Row k={t('bills.remaining')} v={<Money value={snapshot.chargesRemaining} />} tone={snapshot.chargesRemaining > 0 ? 'neg' : 'pos'} note={t('bills.remainingNote')} /></div>
    </Card>

    <Card title={t('bills.dueDates')}>
      {snapshot.charges.length === 0 ? <Empty text={t('bills.noneDue')} /> : <div className="list">{snapshot.charges.map((charge) => <div className="item" key={charge.id}>
        <div className="main"><div className={`title ${charge.paid ? 'strike' : ''}`}><span className={`dot ${charge.paid ? 'ok' : charge.late ? 'danger' : 'warn'}`} style={{ display: 'inline-block', marginRight: 7 }} />{charge.label}</div><div className="meta">{t('bills.dueDate', { date: dateLabel(charge.dueDate) })}{charge.paid ? ` - ${t('bills.paidOn', { date: dateLabel(charge.paidDate ?? charge.dueDate) })}` : charge.late ? ` - ${t('bills.late')}` : ''}</div></div>
        <div className="amt"><Money value={charge.amount} /></div>
        {charge.paid ? <button className="btn small ghost" onClick={() => cancelPayment(charge.id)}>{t('common.cancel')}</button> : <button className="btn small primary" onClick={() => pay(charge.id, charge.amount)}>{t('bills.pay')}</button>}
      </div>)}</div>}
    </Card>

    <Card title={t('bills.all')}>
      {ledger.charges.filter((charge) => charge.deleted_at === null).length === 0 ? <><Empty text={t('bills.empty')} /><div className="chips">{suggestions.map((name) => <button key={name} className="chip" onClick={() => create('charges', { label: name, amount: 0, due_day: 5, frequency: 'mensuelle', start_month: month, active: true })}>{name}</button>)}</div></> : <div className="list">{ledger.charges.filter((charge) => charge.deleted_at === null).sort((a, b) => a.due_day - b.due_day).map((charge) => <div className="item" key={charge.id}>
        <div className="main"><div className="title">{charge.label}</div><div className="meta">{frequencyLabel(charge.frequency)} - {t('bills.dayOfMonth', { day: charge.due_day })}{charge.active ? '' : ` - ${t('bills.disabled')}`}{inactive.some((row) => row.id === charge.id) && charge.active ? ` - ${t('bills.notDue')}` : ''}</div></div>
        <div className="amt"><Money value={charge.amount} /></div><button className="btn small ghost" onClick={() => setEditing(charge.id)}>{t('common.edit')}</button>
      </div>)}</div>}
    </Card>

    {adding && <ChargeSheet title={t('bills.new')} initial={{ label: '', amount: 0, due_day: 5, frequency: 'mensuelle', start_month: month, active: true }} onClose={() => setAdding(false)} onSave={(row) => { create('charges', row); setAdding(false) }} />}
    {editing && <ChargeSheet title={t('bills.edit')} initial={ledger.charges.find((charge) => charge.id === editing)!} onClose={() => setEditing(null)} onDelete={() => { remove('charges', editing); setEditing(null) }} onSave={(row) => { update('charges', editing, row); setEditing(null) }} />}
  </>
}

interface ChargeForm { label: string; amount: number; due_day: number; frequency: ChargeFrequency; start_month: string; active: boolean }

function ChargeSheet({ title, initial, onClose, onSave, onDelete }: { title: string; initial: ChargeForm; onClose: () => void; onSave: (row: ChargeForm) => void; onDelete?: () => void }) {
  const { t } = useI18n()
  const [form, setForm] = useState<ChargeForm>({ label: initial.label, amount: initial.amount, due_day: initial.due_day, frequency: initial.frequency, start_month: initial.start_month, active: initial.active })
  const set = <K extends keyof ChargeForm>(key: K, value: ChargeForm[K]) => setForm((current) => ({ ...current, [key]: value }))
  const frequencies: ChargeFrequency[] = ['mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle']
  const frequencyLabel = (frequency: ChargeFrequency) => t(`bills.frequency.${frequency === 'mensuelle' ? 'monthly' : frequency === 'trimestrielle' ? 'quarterly' : frequency === 'annuelle' ? 'yearly' : 'once'}`)
  return <Sheet title={title} onClose={onClose}>
    <Field label={t('bills.label')}><input value={form.label} onChange={(event) => set('label', event.target.value)} placeholder={t('bills.label')} autoFocus /></Field>
    <Field label={t('bills.amount')}><AmountInput value={form.amount} onChange={(value) => set('amount', value)} /></Field>
    <div className="field-2"><Field label={t('bills.dueDay')}><input type="number" min={1} max={31} value={form.due_day} onChange={(event) => set('due_day', Math.min(31, Math.max(1, Number(event.target.value) || 1)))} /></Field><Field label={t('bills.frequency')}><select value={form.frequency} onChange={(event) => set('frequency', event.target.value as ChargeFrequency)}>{frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequencyLabel(frequency)}</option>)}</select></Field></div>
    <Field label={t('bills.firstMonth')} hint={t('bills.firstMonthHint')}><input type="month" value={form.start_month} onChange={(event) => set('start_month', event.target.value)} /></Field>
    <div className="chips" style={{ marginBottom: 14 }}><button className={`chip ${form.active ? 'on' : ''}`} onClick={() => set('active', true)}>{t('common.active')}</button><button className={`chip ${!form.active ? 'on' : ''}`} onClick={() => set('active', false)}>{t('common.suspended')}</button></div>
    <div className="btn-row">{onDelete && <button className="btn danger" onClick={onDelete}>{t('common.delete')}</button>}<button className="btn primary" disabled={form.label.trim() === '' || form.amount <= 0} onClick={() => onSave({ ...form, label: form.label.trim() })}>{t('common.save')}</button></div>
  </Sheet>
}
