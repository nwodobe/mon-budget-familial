import { useState } from 'react'
import { dateLabel, monthLabel } from '../domain/dates'
import { useApp } from '../state/AppContext'
import { AmountInput, Card, Empty, Field, Money, Row, Sheet } from './common'
import type { ChargeFrequency } from '../domain/types'

const FREQUENCIES: { value: ChargeFrequency; label: string }[] = [
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'trimestrielle', label: 'Trimestrielle' },
  { value: 'annuelle', label: 'Annuelle' },
  { value: 'ponctuelle', label: 'Ponctuelle' },
]

const SUGGESTIONS = ['Loyer', 'Scolarite', 'Electricite', 'Eau', 'Internet', 'Canal+', 'Assurance', 'Credit', 'Salaire domestique']

export default function Charges() {
  const { snapshot, ledger, month, today, create, update, remove } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  /**
   * Regler une charge : on cree la depense correspondante ET le reglement,
   * lies l'un a l'autre. C'est ce lien qui empeche l'application de retenir
   * deux fois le meme argent - une fois comme engagement, une fois comme
   * depense.
   */
  function pay(chargeId: string, amount: number) {
    const expenseId = create('expenses', {
      date: today,
      amount,
      envelope_id: null,
      method: 'banque',
      description: `Reglement ${ledger.charges.find((c) => c.id === chargeId)?.label ?? 'charge'}`,
      member: ledger.settings.members[0] ?? 'Moi',
      charge_id: chargeId,
      override_reason: '',
    })
    create('charge_payments', { charge_id: chargeId, month, paid_date: today, amount, expense_id: expenseId })
  }

  function cancelPayment(chargeId: string) {
    const payment = ledger.charge_payments.find(
      (p) => p.charge_id === chargeId && p.month === month && p.deleted_at === null,
    )
    if (!payment) return
    if (payment.expense_id) remove('expenses', payment.expense_id)
    remove('charge_payments', payment.id)
  }

  const inactive = ledger.charges.filter(
    (c) => c.deleted_at === null && !snapshot.charges.some((s) => s.id === c.id),
  )

  return (
    <>
      <Card title={`Charges de ${monthLabel(month)}`} action={<button className="btn small ghost" onClick={() => setAdding(true)}>Ajouter</button>}>
        <div className="rows">
          <Row k="Total du mois" v={<Money value={snapshot.chargesDue} />} />
          <Row k="Deja regle" v={<Money value={snapshot.chargesPaid} />} tone="pos" />
          <Row
            k="Reste a payer"
            v={<Money value={snapshot.chargesRemaining} />}
            tone={snapshot.chargesRemaining > 0 ? 'neg' : 'pos'}
            note="Cet argent n est jamais compte comme disponible"
          />
        </div>
      </Card>

      <Card title="Echeances">
        {snapshot.charges.length === 0 ? (
          <Empty text="Aucune charge due ce mois." />
        ) : (
          <div className="list">
            {snapshot.charges.map((c) => (
              <div className="item" key={c.id}>
                <div className="main">
                  <div className={`title ${c.paid ? 'strike' : ''}`}>
                    <span className={`dot ${c.paid ? 'ok' : c.late ? 'danger' : 'warn'}`} style={{ display: 'inline-block', marginRight: 7 }} />
                    {c.label}
                  </div>
                  <div className="meta">
                    Echeance {dateLabel(c.dueDate)}
                    {c.paid ? ` - reglee le ${dateLabel(c.paidDate ?? c.dueDate)}` : c.late ? ' - en retard' : ''}
                  </div>
                </div>
                <div className="amt">
                  <Money value={c.amount} />
                </div>
                {c.paid ? (
                  <button className="btn small ghost" onClick={() => cancelPayment(c.id)}>
                    Annuler
                  </button>
                ) : (
                  <button className="btn small primary" onClick={() => pay(c.id, c.amount)}>
                    Payer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Toutes les charges">
        {ledger.charges.filter((c) => c.deleted_at === null).length === 0 ? (
          <>
            <Empty text="Declarez vos engagements fixes." />
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="chip"
                  onClick={() =>
                    create('charges', {
                      label: s,
                      amount: 0,
                      due_day: 5,
                      frequency: 'mensuelle',
                      start_month: month,
                      active: true,
                    })
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="list">
            {ledger.charges
              .filter((c) => c.deleted_at === null)
              .sort((a, b) => a.due_day - b.due_day)
              .map((c) => (
                <div className="item" key={c.id}>
                  <div className="main">
                    <div className="title">{c.label}</div>
                    <div className="meta">
                      {FREQUENCIES.find((f) => f.value === c.frequency)?.label} - le {c.due_day} du mois
                      {c.active ? '' : ' - desactivee'}
                      {inactive.some((x) => x.id === c.id) && c.active ? ' - non due ce mois' : ''}
                    </div>
                  </div>
                  <div className="amt">
                    <Money value={c.amount} />
                  </div>
                  <button className="btn small ghost" onClick={() => setEditing(c.id)}>
                    Modifier
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>

      {adding && (
        <ChargeSheet
          title="Nouvelle charge"
          initial={{ label: '', amount: 0, due_day: 5, frequency: 'mensuelle', start_month: month, active: true }}
          onClose={() => setAdding(false)}
          onSave={(row) => {
            create('charges', row)
            setAdding(false)
          }}
        />
      )}

      {editing && (
        <ChargeSheet
          title="Modifier la charge"
          initial={ledger.charges.find((c) => c.id === editing)!}
          onClose={() => setEditing(null)}
          onDelete={() => {
            remove('charges', editing)
            setEditing(null)
          }}
          onSave={(row) => {
            update('charges', editing, row)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

interface ChargeForm {
  label: string
  amount: number
  due_day: number
  frequency: ChargeFrequency
  start_month: string
  active: boolean
}

function ChargeSheet({
  title,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  title: string
  initial: ChargeForm
  onClose: () => void
  onSave: (row: ChargeForm) => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState<ChargeForm>({
    label: initial.label,
    amount: initial.amount,
    due_day: initial.due_day,
    frequency: initial.frequency,
    start_month: initial.start_month,
    active: initial.active,
  })
  const set = <K extends keyof ChargeForm>(k: K, v: ChargeForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Sheet title={title} onClose={onClose}>
      <Field label="Intitule">
        <input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Loyer" autoFocus />
      </Field>
      <Field label="Montant en FCFA">
        <AmountInput value={form.amount} onChange={(v) => set('amount', v)} />
      </Field>
      <div className="field-2">
        <Field label="Jour d echeance">
          <input
            type="number"
            min={1}
            max={31}
            value={form.due_day}
            onChange={(e) => set('due_day', Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          />
        </Field>
        <Field label="Frequence">
          <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as ChargeFrequency)}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Premier mois du" hint="La charge n est due qu a partir de ce mois.">
        <input type="month" value={form.start_month} onChange={(e) => set('start_month', e.target.value)} />
      </Field>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip ${form.active ? 'on' : ''}`} onClick={() => set('active', true)}>
          Active
        </button>
        <button className={`chip ${!form.active ? 'on' : ''}`} onClick={() => set('active', false)}>
          Suspendue
        </button>
      </div>
      <div className="btn-row">
        {onDelete && (
          <button className="btn danger" onClick={onDelete}>
            Supprimer
          </button>
        )}
        <button className="btn primary" disabled={form.label.trim() === '' || form.amount <= 0} onClick={() => onSave({ ...form, label: form.label.trim() })}>
          Enregistrer
        </button>
      </div>
    </Sheet>
  )
}
