import { useState } from 'react'
import { monthLabel } from '../domain/dates'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet, useMoneyText } from './common'

const SUGGESTION_KEYS = ['food', 'transport', 'fuel', 'home', 'health', 'phone', 'electricity', 'water', 'familyHelp', 'leisure', 'restaurant', 'unexpected'] as const

export default function Budget() {
  const { t } = useI18n()
  const money = useMoneyText()
  const { snapshot, ledger, month, create, update, remove } = useApp()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const totalSpent = snapshot.envelopes.reduce((sum, envelope) => sum + envelope.spent, 0)
  const provisionTarget = snapshot.provisions.reduce((sum, provision) => sum + provision.monthlyNeeded, 0)
  const used = new Set(snapshot.envelopes.map((envelope) => envelope.name.toLowerCase()))
  const suggestions = SUGGESTION_KEYS.map((key) => t(`category.${key}`))
  const missing = suggestions.filter((suggestion) => !used.has(suggestion.toLowerCase()))

  return <>
    <Card title={t('budget.monthPlan', { month: monthLabel(month) })}>
      <div className="rows">
        <Row k={t('budget.receivedIncome')} v={<Money value={snapshot.income} />} tone="pos" />
        {snapshot.incomeExpected > 0 && <Row k={t('budget.expectedIncome')} v={<Money value={snapshot.incomeExpected} />} note={t('budget.expectedNote')} />}
        <Row k={t('budget.mandatoryBills')} v={<Money value={snapshot.chargesDue} />} />
        <Row k={t('budget.decidedSavings')} v={<Money value={snapshot.savingsTarget} />} />
        <Row k={t('budget.monthProvisions')} v={<Money value={provisionTarget} />} />
        <Row k={t('budget.envelopeCapacity')} v={<Money value={snapshot.envelopeCapacity} />} />
        <Row k={t('budget.allocated')} v={<Money value={snapshot.envelopeAllocated} />} />
        <Row k={snapshot.envelopeAllocationGap >= 0 ? t('budget.leftToAllocate') : t('budget.overAllocation')} v={<Money value={Math.abs(snapshot.envelopeAllocationGap)} />} tone={snapshot.envelopeAllocationGap >= 0 ? 'pos' : 'neg'} />
      </div>
      <div className={`banner mt ${snapshot.envelopeAllocationStatus === 'impossible' ? 'over' : ''}`}><span className={`dot ${snapshot.envelopeAllocationStatus === 'impossible' ? 'danger' : 'ok'}`} />{snapshot.envelopeAllocationStatus === 'impossible' ? t('budget.impossible', { amount: money(Math.abs(snapshot.envelopeAllocationGap)) }) : t('budget.balanced', { amount: money(snapshot.envelopeAllocationGap) })}</div>
    </Card>

    <Card title={t('budget.envelopes')} action={<button className="btn small ghost" onClick={() => setAdding(true)}>{t('common.add')}</button>}>
      {snapshot.envelopes.length === 0 ? <Empty text={t('budget.empty')} /> : snapshot.envelopes.map((envelope) => <div className="env" key={envelope.id}>
        <div className="env-head"><div className="env-name"><span className={`dot ${envelope.state === 'depasse' ? 'danger' : envelope.state === 'attention' ? 'warn' : 'ok'}`} style={{ display: 'inline-block', marginRight: 7 }} />{envelope.name}</div><button className="btn small ghost" onClick={() => setEditing(envelope.id)}>{t('common.edit')}</button></div>
        <Bar pct={envelope.usedPct} state={envelope.state} />
        <div className="env-sub"><span><Money value={envelope.spent} currency={false} /> / <Money value={envelope.planned} /> ({envelope.usedPct}%)</span><span>{envelope.remaining >= 0 ? t('dashboard.leftPrefix') : t('dashboard.overPrefix')}<Money value={Math.abs(envelope.remaining)} /></span></div>
      </div>)}
      {snapshot.envelopes.length > 0 && <div className="tiny mt">{t('budget.totalSpent', { amount: money(totalSpent) })}</div>}
    </Card>

    {missing.length > 0 && <Card title={t('budget.commonCategories')}><div className="chips">{missing.map((name) => <button key={name} className="chip" onClick={() => create('envelopes', { name, planned: 0, position: snapshot.envelopes.length })}>{name}</button>)}</div></Card>}

    {adding && <EnvelopeSheet title={t('budget.newEnvelope')} initialName="" initialPlanned={0} onClose={() => setAdding(false)} onSave={(name, planned) => { create('envelopes', { name, planned, position: snapshot.envelopes.length }); setAdding(false) }} />}
    {editing && <EnvelopeSheet title={t('budget.editEnvelope')} initialName={snapshot.envelopes.find((envelope) => envelope.id === editing)?.name ?? ''} initialPlanned={snapshot.envelopes.find((envelope) => envelope.id === editing)?.planned ?? 0} monthNote={t('budget.appliesFrom', { month: monthLabel(month) })} onDelete={() => { remove('envelopes', editing); setEditing(null) }} onClose={() => setEditing(null)} onSave={(name, planned) => { update('envelopes', editing, { name, planned }); const override = ledger.budget_overrides.find((row) => row.envelope_id === editing && row.month === month && row.deleted_at === null); if (override) update('budget_overrides', override.id, { planned }); setEditing(null) }} />}
  </>
}

function EnvelopeSheet({ title, initialName, initialPlanned, monthNote, onClose, onSave, onDelete }: { title: string; initialName: string; initialPlanned: number; monthNote?: string; onClose: () => void; onSave: (name: string, planned: number) => void; onDelete?: () => void }) {
  const { t } = useI18n()
  const money = useMoneyText()
  const [name, setName] = useState(initialName)
  const [planned, setPlanned] = useState(initialPlanned)
  return <Sheet title={title} onClose={onClose}>
    <Field label={t('budget.envelopeName')}><input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('category.food')} autoFocus /></Field>
    <Field label={t('budget.monthlyBudget')} hint={monthNote}><AmountInput value={planned} onChange={setPlanned} /></Field>
    <div className="tiny mt">{planned > 0 ? t('budget.perDay', { amount: money(Math.floor(planned / 30)) }) : ''}</div>
    <div className="btn-row mt">{onDelete && <button className="btn danger" onClick={onDelete}>{t('common.delete')}</button>}<button className="btn primary" disabled={name.trim() === ''} onClick={() => onSave(name.trim(), planned)}>{t('common.save')}</button></div>
  </Sheet>
}
