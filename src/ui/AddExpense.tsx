import { useState } from 'react'
import { simulateExpenseV2, type ExpenseSimulationV2 } from '../domain/disciplineV2'
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/types'
import { paymentLabel, useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Field, Money, Row, Sheet, useMoneyText } from './common'

export default function AddExpense({ onClose }: { onClose: () => void }) {
  const { language, t } = useI18n()
  const money = useMoneyText()
  const { ledger, snapshot, month, create, today } = useApp()
  const [amount, setAmount] = useState(0)
  const [envelopeId, setEnvelopeId] = useState<string>('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('especes')
  const [description, setDescription] = useState('')
  const [member, setMember] = useState(ledger.settings.members[0] ?? (language === 'fr' ? 'Moi' : 'Me'))
  const [simulation, setSimulation] = useState<ExpenseSimulationV2 | null>(null)
  const [reason, setReason] = useState('')
  const envelopes = snapshot.envelopes

  function save(sim: ExpenseSimulationV2 | null, overrideReason: string) {
    create('expenses', { date, amount, envelope_id: envelopeId || null, method, description: description.trim(), member, charge_id: null, override_reason: overrideReason, discipline_flags: sim?.flags ?? [] })
    onClose()
  }

  function attempt() {
    if (amount <= 0) return
    const sim = simulateExpenseV2(ledger, month, today, { amount, envelopeId: envelopeId || null, date })
    if (sim.globalRisk !== 'none' || sim.envelope) { setSimulation(sim); return }
    save(null, '')
  }

  if (simulation) {
    const danger = simulation.globalRisk === 'danger'
    const warning = simulation.globalRisk === 'warning'
    const envelope = simulation.envelope
    const requireReason = danger
    const title = danger ? t('expense.dangerTitle') : warning ? t('expense.warningTitle') : envelope?.warningOnly ? t('expense.thresholdTitle') : t('expense.overTitle')
    return <Sheet title={title} onClose={() => setSimulation(null)}>
      {(danger || warning) && <div className={`alert ${danger ? 'over' : ''}`}>
        <div className="alert-title"><span className={`dot ${danger ? 'danger' : 'warn'}`} />{danger ? t('expense.dangerBody') : t('expense.warningBody')}</div>
        <div className="rows"><Row k={t('expense.newExpense')} v={<Money value={amount} />} /><Row k={t('expense.availableBefore')} v={<Money value={Math.max(0, simulation.availableBefore)} />} /><Row k={t('expense.availableAfter')} v={<Money value={Math.max(0, simulation.availableAfter)} />} tone={simulation.availableAfter < 0 ? 'neg' : undefined} />{simulation.after.deficit > 0 && <Row k={t('expense.deficit')} v={<Money value={simulation.after.deficit} />} tone="neg" />}<Row k={t('expense.dailyAfter')} v={<Money value={Math.max(0, simulation.dailyAfter)} />} /></div>
      </div>}
      {envelope && <div className={`alert mt ${envelope.warningOnly ? '' : 'over'}`}>
        <div className="alert-title"><span className={`dot ${envelope.warningOnly ? 'warn' : 'danger'}`} />{envelope.warningOnly ? t('expense.envelopeWarning', { name: envelope.envelopeName, pct: ledger.settings.warn_threshold_pct }) : t('expense.envelopeOver', { name: envelope.envelopeName, amount: money(envelope.overBy) })}</div>
        <div className="rows"><Row k={t('expense.envelopeBudget')} v={<Money value={envelope.planned} />} /><Row k={t('expense.alreadySpent')} v={<Money value={envelope.alreadySpent} />} /><Row k={t('expense.newTotal')} v={<Money value={envelope.newTotal} />} tone={envelope.warningOnly ? undefined : 'neg'} /></div>
      </div>}
      <Field label={t('expense.reason')} hint={requireReason ? t('expense.reasonRequired') : t('expense.reasonOptional')}><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="btn-row"><button className="btn" onClick={() => setSimulation(null)}>{t('common.cancel')}</button><button className="btn primary" disabled={requireReason && reason.trim().length < 3} onClick={() => save(simulation, reason.trim())}>{t('expense.continue')}</button></div>
    </Sheet>
  }

  return <Sheet title={t('expense.add')} onClose={onClose}>
    <Field label={t('expense.amount')}><AmountInput value={amount} onChange={setAmount} autoFocus /></Field>
    <Field label={t('expense.envelope')} hint={envelopes.length === 0 ? t('expense.noEnvelopeHint') : undefined}><select value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}><option value="">{t('expense.outsideEnvelope')}</option>{envelopes.map((e) => <option key={e.id} value={e.id}>{t('expense.envelopeRemaining', { name: e.name, amount: money(e.remaining) })}</option>)}</select></Field>
    <div className="field-2"><Field label={t('expense.date')}><input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label={t('expense.payment')}><select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{paymentLabel(language, m.value)}</option>)}</select></Field></div>
    <Field label={t('expense.description')}><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('expense.descriptionPlaceholder')} /></Field>
    {ledger.settings.members.length > 1 && <Field label={t('expense.person')}><div className="chips">{ledger.settings.members.map((m) => <button key={m} className={`chip ${m === member ? 'on' : ''}`} onClick={() => setMember(m)}>{m}</button>)}</div></Field>}
    <div className="banner" style={{ marginBottom: 14 }}><span className={`dot ${snapshot.health === 'danger' ? 'danger' : snapshot.health === 'attention' ? 'warn' : 'ok'}`} />{t('expense.currentSafe', { amount: money(snapshot.spendable) })}</div>
    <button className="btn primary" disabled={amount <= 0} onClick={attempt}>{t('expense.simulate')}</button>
  </Sheet>
}
