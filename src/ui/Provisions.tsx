import { useState } from 'react'
import { dateLabel } from '../domain/dates'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

const SUGGESTIONS_FR = ['Scolarité', 'Assurance voiture', 'Entretien voiture', 'Voyage', 'Fêtes', 'Impôts', 'Réparation maison']
const SUGGESTIONS_EN = ['School fees', 'Car insurance', 'Car maintenance', 'Travel', 'Celebrations', 'Taxes', 'Home repairs']

export default function Provisions() {
  const { language, t } = useI18n()
  const { ledger, snapshot, create, update, remove, today } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [suggestedName, setSuggestedName] = useState('')
  const activeRows = ledger.provisions.filter((row) => row.deleted_at === null)
  const suggestions = language === 'fr' ? SUGGESTIONS_FR : SUGGESTIONS_EN

  return <>
    <Card title={t('provisions.title')}><p className="tiny" style={{ marginTop: 0 }}>{t('provisions.body')}</p><div className="rows"><Row k={t('provisions.generalSavings')} v={<Money value={snapshot.savingsRemaining} />} /><Row k={t('provisions.monthReserve')} v={<Money value={snapshot.provisionsReserveRemaining} />} /><Row k={t('provisions.totalReserve')} v={<Money value={snapshot.protectedReserveRemaining} />} /></div></Card>
    <Card title={t('provisions.active')} action={<button className="btn small ghost" onClick={() => { setSuggestedName(''); setAdding(true) }}>{t('common.add')}</button>}>
      {snapshot.provisions.length === 0 ? <Empty text={t('provisions.empty')} /> : snapshot.provisions.map((provision) => <div className="env" key={provision.id}><div className="env-head"><div className="env-name">{provision.name}</div><button className="btn small ghost" onClick={() => setEditing(provision.id)}>{t('common.edit')}</button></div><Bar pct={provision.progressPct} /><div className="env-sub"><span><Money value={provision.funded} currency={false} /> / <Money value={provision.target} /></span><span>{provision.progressPct}%</span></div><div className="rows mt"><Row k={t('provisions.deadline')} v={dateLabel(provision.targetDate)} /><Row k={t('provisions.remaining')} v={<Money value={provision.remaining} />} /><Row k={t('provisions.recommended')} v={<><Money value={provision.monthlyNeeded} />{t('provisions.perMonth')}</>} /><Row k={t('provisions.remainingThisMonth')} v={<Money value={provision.reserveRemainingThisMonth} />} tone={provision.reserveRemainingThisMonth > 0 ? undefined : 'pos'} /></div></div>)}
    </Card>
    {activeRows.length === 0 && <Card title={t('provisions.examples')}><div className="chips">{suggestions.map((name) => <button key={name} className="chip" onClick={() => { setSuggestedName(name); setAdding(true) }}>{name}</button>)}</div></Card>}
    {adding && <ProvisionSheet title={t('provisions.new')} initial={{ name: suggestedName, target_amount: 0, target_date: today, pocket_id: null, initial_amount: 0, active: true }} onClose={() => { setAdding(false); setSuggestedName('') }} onSave={(row) => { create('provisions', row); setAdding(false); setSuggestedName('') }} />}
    {editing && <ProvisionSheet title={t('provisions.edit')} initial={ledger.provisions.find((row) => row.id === editing)!} onClose={() => setEditing(null)} onDelete={() => { remove('provisions', editing); setEditing(null) }} onSave={(row) => { update('provisions', editing, row); setEditing(null) }} />}
  </>
}

interface ProvisionForm { name: string; target_amount: number; target_date: string; pocket_id: string | null; initial_amount: number; active: boolean }

function ProvisionSheet({ title, initial, onClose, onSave, onDelete }: { title: string; initial: ProvisionForm; onClose: () => void; onSave: (row: ProvisionForm) => void; onDelete?: () => void }) {
  const { language, t } = useI18n()
  const { ledger, today } = useApp()
  const [form, setForm] = useState<ProvisionForm>({ ...initial })
  const set = <K extends keyof ProvisionForm>(key: K, value: ProvisionForm[K]) => setForm((current) => ({ ...current, [key]: value }))
  return <Sheet title={title} onClose={onClose}>
    <Field label={t('provisions.label')}><input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder={language === 'fr' ? 'Assurance voiture' : 'Car insurance'} autoFocus /></Field>
    <Field label={t('provisions.target')}><AmountInput value={form.target_amount} onChange={(value) => set('target_amount', value)} /></Field>
    <Field label={t('provisions.deadline')}><input type="date" min={today} value={form.target_date} onChange={(event) => set('target_date', event.target.value)} /></Field>
    <Field label={t('provisions.initial')}><AmountInput value={form.initial_amount} onChange={(value) => set('initial_amount', value)} /></Field>
    <Field label={t('provisions.pocket')} hint={t('provisions.pocketHint')}><select value={form.pocket_id ?? ''} onChange={(event) => set('pocket_id', event.target.value || null)}><option value="">{t('provisions.noPocket')}</option>{ledger.pockets.filter((pocket) => pocket.deleted_at === null).map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}</select></Field>
    <div className="chips" style={{ marginBottom: 14 }}><button className={`chip ${form.active ? 'on' : ''}`} onClick={() => set('active', true)}>{t('common.active')}</button><button className={`chip ${!form.active ? 'on' : ''}`} onClick={() => set('active', false)}>{t('common.suspended')}</button></div>
    <div className="btn-row">{onDelete && <button className="btn danger" onClick={onDelete}>{t('common.delete')}</button>}<button className="btn primary" disabled={!form.name.trim() || form.target_amount <= 0 || form.target_date < today} onClick={() => onSave({ ...form, name: form.name.trim() })}>{t('common.save')}</button></div>
  </Sheet>
}
