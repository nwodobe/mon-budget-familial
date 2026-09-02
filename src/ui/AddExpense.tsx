import { useState } from 'react'
import { simulateExpenseV2, formatInt, type ExpenseSimulationV2 } from '../domain/disciplineV2'
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/types'
import { useApp } from '../state/AppContext'
import { AmountInput, Field, Money, Row, Sheet } from './common'

export default function AddExpense({ onClose }: { onClose: () => void }) {
  const { ledger, snapshot, month, create, today } = useApp()
  const [amount, setAmount] = useState(0)
  const [envelopeId, setEnvelopeId] = useState<string>('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('especes')
  const [description, setDescription] = useState('')
  const [member, setMember] = useState(ledger.settings.members[0] ?? 'Moi')
  const [simulation, setSimulation] = useState<ExpenseSimulationV2 | null>(null)
  const [reason, setReason] = useState('')

  const envelopes = snapshot.envelopes

  function save(sim: ExpenseSimulationV2 | null, overrideReason: string) {
    create('expenses', {
      date,
      amount,
      envelope_id: envelopeId || null,
      method,
      description: description.trim(),
      member,
      charge_id: null,
      override_reason: overrideReason,
      discipline_flags: sim?.flags ?? [],
    })
    onClose()
  }

  function attempt() {
    if (amount <= 0) return
    const sim = simulateExpenseV2(ledger, month, today, {
      amount,
      envelopeId: envelopeId || null,
      date,
    })
    if (sim.globalRisk !== 'none' || sim.envelope) {
      setSimulation(sim)
      return
    }
    save(null, '')
  }

  if (simulation) {
    const danger = simulation.globalRisk === 'danger'
    const warning = simulation.globalRisk === 'warning'
    const envelope = simulation.envelope
    const requireReason = danger
    const title = danger
      ? 'Cette dépense met votre mois en danger'
      : warning
        ? 'Cette dépense fragilise votre mois'
        : envelope?.warningOnly
          ? "Seuil d'alerte atteint"
          : 'Dépassement de budget'

    return (
      <Sheet title={title} onClose={() => setSimulation(null)}>
        {(danger || warning) && (
          <div className={`alert ${danger ? 'over' : ''}`}>
            <div className="alert-title">
              <span className={`dot ${danger ? 'danger' : 'warn'}`} />
              {danger
                ? 'Cette dépense ne peut pas être considérée comme sûre avec vos revenus encaissés, vos charges et votre épargne protégée.'
                : 'Cette dépense reste possible, mais elle dégrade votre marge ou votre budget conseillé aujourd’hui.'}
            </div>
            <div className="rows">
              <Row k="Nouvelle dépense" v={<Money value={amount} />} />
              <Row k="Disponible avant" v={<Money value={Math.max(0, simulation.availableBefore)} />} />
              <Row
                k="Disponible après"
                v={<Money value={Math.max(0, simulation.availableAfter)} />}
                tone={simulation.availableAfter < 0 ? 'neg' : undefined}
              />
              {simulation.after.deficit > 0 && (
                <Row k="Déficit à couvrir" v={<Money value={simulation.after.deficit} />} tone="neg" />
              )}
              <Row k="Budget quotidien après" v={<Money value={Math.max(0, simulation.dailyAfter)} />} />
            </div>
            {simulation.reasons.map((r) => (
              <div className="tiny mt" key={r}>{r}</div>
            ))}
          </div>
        )}

        {envelope && (
          <div className={`alert mt ${envelope.warningOnly ? '' : 'over'}`}>
            <div className="alert-title">
              <span className={`dot ${envelope.warningOnly ? 'warn' : 'danger'}`} />
              {envelope.warningOnly
                ? `L'enveloppe ${envelope.envelopeName} atteindra au moins ${ledger.settings.warn_threshold_pct} %.`
                : `L'enveloppe ${envelope.envelopeName} sera dépassée de ${formatInt(envelope.overBy)} FCFA.`}
            </div>
            <div className="rows">
              <Row k="Budget enveloppe" v={<Money value={envelope.planned} />} />
              <Row k="Déjà dépensé" v={<Money value={envelope.alreadySpent} />} />
              <Row k="Nouveau total" v={<Money value={envelope.newTotal} />} tone={envelope.warningOnly ? undefined : 'neg'} />
            </div>
          </div>
        )}

        <Field
          label="Pourquoi cette dépense est-elle nécessaire ?"
          hint={requireReason ? 'Obligatoire pour continuer malgré un déficit.' : 'Facultatif, mais utile pour relire vos arbitrages.'}
        >
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        <div className="btn-row">
          <button className="btn" onClick={() => setSimulation(null)}>Annuler</button>
          <button
            className="btn primary"
            disabled={requireReason && reason.trim().length < 3}
            onClick={() => save(simulation, reason.trim())}
          >
            Continuer malgré tout
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Ajouter une dépense" onClose={onClose}>
      <Field label="Montant en FCFA">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </Field>

      <Field label="Enveloppe" hint={envelopes.length === 0 ? 'Aucune enveloppe définie : la dépense sera hors budget.' : undefined}>
        <select value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}>
          <option value="">Hors enveloppe</option>
          {envelopes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} - reste {e.remaining >= 0 ? '' : '-'}{formatInt(Math.abs(e.remaining))} FCFA
            </option>
          ))}
        </select>
      </Field>

      <div className="field-2">
        <Field label="Date">
          <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Moyen de paiement">
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Carburant, marché, école..." />
      </Field>

      {ledger.settings.members.length > 1 && (
        <Field label="Personne concernée">
          <div className="chips">
            {ledger.settings.members.map((m) => (
              <button key={m} className={`chip ${m === member ? 'on' : ''}`} onClick={() => setMember(m)}>{m}</button>
            ))}
          </div>
        </Field>
      )}

      <div className="banner" style={{ marginBottom: 14 }}>
        <span className={`dot ${snapshot.health === 'danger' ? 'danger' : snapshot.health === 'attention' ? 'warn' : 'ok'}`} />
        Disponible sûr actuel : {formatInt(snapshot.spendable)} FCFA.
      </div>

      <button className="btn primary" disabled={amount <= 0} onClick={attempt}>
        Simuler puis enregistrer
      </button>
    </Sheet>
  )
}
