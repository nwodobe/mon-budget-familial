import { useState } from 'react'
import { dateLabel, monthLabel } from '../domain/dates'
import { formatInt } from '../domain/disciplineV2'
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/types'
import { useApp } from '../state/AppContext'
import { AmountInput, Card, Empty, Field, Money, Row, Sheet } from './common'

const SOURCES = ['Salaire', 'Business', 'Location', 'Prime', 'Revenus du conjoint', 'Autre']

export default function Revenus() {
  const { ledger, month, snapshot, create, remove, today } = useApp()
  const [adding, setAdding] = useState(false)

  const rows = ledger.incomes
    .filter((i) => i.deleted_at === null && i.date.slice(0, 7) === month)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Card title={`Revenus de ${monthLabel(month)}`} action={<button className="btn small ghost" onClick={() => setAdding(true)}>Ajouter</button>}>
        <div className="rows">
          <Row k="Revenus encaissés" v={<Money value={snapshot.income} />} tone="pos" note="Seuls ceux-ci entrent dans votre Disponible à dépenser" />
          <Row k="Revenus encore attendus" v={<Money value={snapshot.incomeExpected} />} note="Ils restent exclus du Disponible jusqu'à leur date" />
          <Row k="Total prévu du mois" v={<Money value={snapshot.incomePlanned} />} />
          <Row k="Épargne cible sur encaissé" v={<Money value={snapshot.savingsTarget} />} note={`${ledger.settings.savings_rate_pct} % des revenus réellement encaissés`} />
        </div>
      </Card>

      <Card title="Détail">
        {rows.length === 0 ? (
          <Empty text="Aucun revenu enregistré pour ce mois." />
        ) : (
          <div className="list">
            {rows.map((i) => {
              const expected = i.date > today
              return (
                <div className="item" key={i.id}>
                  <div className="main">
                    <div className="title"><span className={`dot ${expected ? 'warn' : 'ok'}`} style={{ display: 'inline-block', marginRight: 7 }} />{i.source}</div>
                    <div className="meta">
                      {expected ? 'Attendu' : 'Encaissé'} - {dateLabel(i.date)} - {PAYMENT_METHODS.find((m) => m.value === i.method)?.label}
                      {i.recurring ? ' - récurrent' : ''}{i.note ? ` - ${i.note}` : ''}
                    </div>
                  </div>
                  <div className="amt"><Money value={i.amount} /></div>
                  <button className="btn small ghost" onClick={() => remove('incomes', i.id)}>Retirer</button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {adding && <IncomeSheet onClose={() => setAdding(false)} onSave={(row) => { create('incomes', row); setAdding(false) }} />}
    </>
  )
}

function IncomeSheet({ onClose, onSave }: {
  onClose: () => void
  onSave: (row: { date: string; amount: number; source: string; method: PaymentMethod; recurring: boolean; note: string }) => void
}) {
  const { today, ledger } = useApp()
  const [amount, setAmount] = useState(0)
  const [source, setSource] = useState(SOURCES[0])
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('banque')
  const [recurring, setRecurring] = useState(true)
  const [note, setNote] = useState('')
  const reserved = Math.round((amount * ledger.settings.savings_rate_pct) / 100)
  const future = date > today

  return (
    <Sheet title="Ajouter un revenu" onClose={onClose}>
      <Field label="Montant en FCFA"><AmountInput value={amount} onChange={setAmount} autoFocus /></Field>
      {amount > 0 && (
        <div className="banner mt" style={{ marginBottom: 13 }}>
          <span className={`dot ${future ? 'warn' : 'ok'}`} />
          {future
            ? `Ce revenu sera affiché comme attendu et n'augmentera pas votre Disponible avant le ${dateLabel(date)}.`
            : `Épargne recommandée : ${formatInt(reserved)} FCFA. Montant après réserve : ${formatInt(amount - reserved)} FCFA.`}
        </div>
      )}
      <Field label="Source"><select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
      <div className="field-2">
        <Field label="Date prévue / encaissée"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Moyen"><select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
      </div>
      <Field label="Commentaire"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip ${recurring ? 'on' : ''}`} onClick={() => setRecurring(true)}>Récurrent</button>
        <button className={`chip ${!recurring ? 'on' : ''}`} onClick={() => setRecurring(false)}>Exceptionnel</button>
      </div>
      <button className="btn primary" disabled={amount <= 0} onClick={() => onSave({ date, amount, source, method, recurring, note: note.trim() })}>Enregistrer le revenu</button>
    </Sheet>
  )
}
