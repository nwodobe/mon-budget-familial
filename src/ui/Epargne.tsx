import { useState } from 'react'
import { dateLabel, monthLabel } from '../domain/dates'
import { useI18n } from '../i18n'
import { useApp } from '../state/AppContext'
import { AmountInput, Bar, Card, Empty, Field, Money, Row, Sheet } from './common'

const POCKETS_FR = ['Épargne de sécurité', 'Vacances', 'Projet immobilier', 'Voiture', 'Investissement', 'École des enfants', 'Urgence']
const POCKETS_EN = ['Emergency fund', 'Vacation', 'Home project', 'Car', 'Investment', 'Children school', 'Emergency']

export default function Epargne() {
  const { language, t } = useI18n()
  const { ledger, pockets, snapshot, month, create, remove, updateSettings } = useApp()
  const [moving, setMoving] = useState<'depot' | 'retrait' | null>(null)
  const suggestions = language === 'fr' ? POCKETS_FR : POCKETS_EN
  const total = pockets.reduce((sum, pocket) => sum + pocket.balance, 0)
  const progress = snapshot.savingsTarget > 0 ? Math.round((snapshot.savingsDone / snapshot.savingsTarget) * 100) : 0
  const movements = ledger.savings.filter((row) => row.deleted_at === null && row.date.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date))

  return <>
    <Card title={t('savings.monthTitle', { month: monthLabel(month) })}>
      <div className="rows"><Row k={t('savings.monthGoal')} v={<Money value={snapshot.savingsTarget} />} note={t('savings.goalNote', { pct: ledger.settings.savings_rate_pct })} /><Row k={t('savings.saved')} v={<Money value={snapshot.savingsDone} />} tone="pos" /><Row k={t('savings.remaining')} v={<Money value={snapshot.savingsRemaining} />} tone={snapshot.savingsRemaining > 0 ? 'neg' : 'pos'} /></div>
      <div className="mt"><Bar pct={Math.min(100, progress)} state={progress >= 100 ? 'sain' : progress >= 50 ? 'attention' : 'depasse'} /><div className="tiny mt">{t('savings.goalProgress', { pct: progress })}</div></div>
      <div className="btn-row mt"><button className="btn primary" onClick={() => setMoving('depot')} disabled={pockets.length === 0}>{t('savings.save')}</button><button className="btn" onClick={() => setMoving('retrait')} disabled={pockets.length === 0}>{t('savings.withdraw')}</button></div>
    </Card>

    <Card title={t('savings.rate')}><Field label={t('savings.rateLabel', { pct: ledger.settings.savings_rate_pct })}><input type="range" min={0} max={50} step={1} value={ledger.settings.savings_rate_pct} onChange={(event) => updateSettings({ savings_rate_pct: Number(event.target.value) })} /></Field><div className="tiny">{t('savings.rateBody')}</div></Card>

    <Card title={t('savings.pockets')}>
      {pockets.length === 0 ? <><Empty text={t('savings.noPockets')} /><div className="chips">{suggestions.map((name, position) => <button key={name} className="chip" onClick={() => create('pockets', { name, position })}>{name}</button>)}</div></> : <><div className="list">{pockets.map((pocket) => <div className="item" key={pocket.id}><div className="main"><div className="title">{pocket.name}</div></div><div className="amt"><Money value={pocket.balance} /></div><button className="btn small ghost" onClick={() => remove('pockets', pocket.id)}>{t('common.remove')}</button></div>)}<div className="item"><div className="main"><div className="title">{t('savings.total')}</div></div><div className="amt"><Money value={total} /></div></div></div><div className="chips mt">{suggestions.filter((name) => !pockets.some((pocket) => pocket.name === name)).map((name) => <button key={name} className="chip" onClick={() => create('pockets', { name, position: pockets.length })}>{name}</button>)}</div></>}
    </Card>

    <Card title={t('savings.movements', { month: monthLabel(month) })}>
      {movements.length === 0 ? <Empty text={t('savings.noMovement')} /> : <div className="list">{movements.map((movement) => <div className="item" key={movement.id}><div className="main"><div className="title">{pockets.find((pocket) => pocket.id === movement.pocket_id)?.name ?? t('savings.deletedPocket')}</div><div className="meta">{dateLabel(movement.date)} - {movement.kind === 'depot' ? t('savings.deposit') : t('savings.withdrawal')}{movement.note ? ` - ${movement.note}` : ''}</div></div><div className={`amt ${movement.kind === 'depot' ? '' : 'strike'}`}>{movement.kind === 'depot' ? '+' : '-'}<Money value={movement.amount} /></div><button className="btn small ghost" onClick={() => remove('savings', movement.id)}>{t('common.remove')}</button></div>)}</div>}
    </Card>
    {moving && <SavingsSheet kind={moving} onClose={() => setMoving(null)} onSave={(row) => { create('savings', row); setMoving(null) }} />}
  </>
}

function SavingsSheet({ kind, onClose, onSave }: { kind: 'depot' | 'retrait'; onClose: () => void; onSave: (row: { date: string; amount: number; pocket_id: string; kind: 'depot' | 'retrait'; note: string }) => void }) {
  const { t } = useI18n()
  const { pockets, today, snapshot } = useApp()
  const [amount, setAmount] = useState(kind === 'depot' ? snapshot.savingsRemaining : 0)
  const [pocketId, setPocketId] = useState(pockets[0]?.id ?? '')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  return <Sheet title={kind === 'depot' ? t('savings.putAside') : t('savings.withdrawTitle')} onClose={onClose}>
    <Field label={t('savings.amount')}><AmountInput value={amount} onChange={setAmount} autoFocus /></Field>
    <Field label={t('savings.pocket')}><select value={pocketId} onChange={(event) => setPocketId(event.target.value)}>{pockets.map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}</select></Field>
    <Field label={t('savings.date')}><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
    <Field label={t('savings.comment')}><input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    <button className="btn primary" disabled={amount <= 0 || pocketId === ''} onClick={() => onSave({ date, amount, pocket_id: pocketId, kind, note: note.trim() })}>{t('common.save')}</button>
  </Sheet>
}
