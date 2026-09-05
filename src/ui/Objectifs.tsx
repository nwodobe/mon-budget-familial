import { useState } from 'react'
import { dateLabel } from '../domain/dates'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

export default function Objectifs() {
  const { t } = useI18n()
  const { goals, pockets, create, remove } = useApp()
  const [adding, setAdding] = useState(false)

  return <>
    <Card title={t('goals.title')} action={<button className="btn small ghost" onClick={() => setAdding(true)}>{t('common.add')}</button>}>
      {goals.length === 0 ? <Empty text={t('goals.empty')} /> : goals.map((goal) => <div className="env" key={goal.id}>
        <div className="env-head"><div className="env-name">{goal.name}</div><button className="btn small ghost" onClick={() => remove('goals', goal.id)}>{t('common.remove')}</button></div>
        <Bar pct={goal.progressPct} state={goal.reachable ? 'sain' : 'depasse'} />
        <div className="rows mt"><Row k={t('goals.target')} v={<Money value={goal.target} />} /><Row k={t('goals.available')} v={<Money value={goal.saved} />} tone="pos" /><Row k={t('goals.remaining')} v={<Money value={goal.remaining} />} /><Row k={t('goals.monthlyNeeded')} v={<Money value={goal.monthlyNeeded} />} note={goal.monthsLeft > 0 ? t('goals.monthsUntil', { months: goal.monthsLeft, date: dateLabel(goal.targetDate) }) : t('goals.deadlineReached', { date: dateLabel(goal.targetDate) })} tone={goal.reachable ? undefined : 'neg'} /><Row k={t('goals.progress')} v={`${goal.progressPct}%`} /></div>
        {!goal.reachable && <div className="banner warn mt"><span className="dot danger" />{t('goals.late')}</div>}
      </div>)}
    </Card>
    {pockets.length === 0 && <div className="banner warn"><span className="dot warn" />{t('goals.noPocket')}</div>}
    {adding && <GoalSheet onClose={() => setAdding(false)} onSave={(row) => { create('goals', row); setAdding(false) }} />}
  </>
}

function GoalSheet({ onClose, onSave }: { onClose: () => void; onSave: (row: { name: string; target_amount: number; target_date: string; pocket_id: string | null; initial_amount: number }) => void }) {
  const { language, t } = useI18n()
  const { pockets, today } = useApp()
  const [name, setName] = useState('')
  const [target, setTarget] = useState(0)
  const [targetDate, setTargetDate] = useState(`${Number(today.slice(0, 4)) + 1}-12-31`)
  const [pocketId, setPocketId] = useState(pockets[0]?.id ?? '')
  const [initial, setInitial] = useState(0)
  return <Sheet title={t('goals.new')} onClose={onClose}>
    <Field label={t('goals.label')}><input value={name} onChange={(event) => setName(event.target.value)} placeholder={language === 'fr' ? 'Vacances' : 'Vacation'} autoFocus /></Field>
    <Field label={t('goals.target')}><AmountInput value={target} onChange={setTarget} /></Field>
    <Field label={t('goals.date')}><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></Field>
    <Field label={t('goals.pocket')} hint={t('goals.pocketHint')}><select value={pocketId} onChange={(event) => setPocketId(event.target.value)}><option value="">{t('goals.noPocketManual')}</option>{pockets.map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}</select></Field>
    <Field label={t('goals.initial')}><AmountInput value={initial} onChange={setInitial} /></Field>
    <button className="btn primary" disabled={name.trim() === '' || target <= 0} onClick={() => onSave({ name: name.trim(), target_amount: target, target_date: targetDate, pocket_id: pocketId || null, initial_amount: initial })}>{t('goals.create')}</button>
  </Sheet>
}
