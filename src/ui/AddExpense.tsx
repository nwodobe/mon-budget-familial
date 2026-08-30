import { useState } from 'react'
import { checkOverspend, formatInt, type OverspendCheck } from '../domain/engine'
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/types'
import { useApp } from '../state/AppContext'
import { AmountInput, Field, Money, Row, Sheet } from './common'

/**
 * Saisie d'une depense.
 *
 * Le point de discipline est ici : quand la depense fait franchir le seuil
 * d'alerte ou depasser l'enveloppe, l'ecran s'interrompt et montre les
 * chiffres AVANT d'enregistrer. L'objectif n'est pas d'empecher la depense,
 * mais d'introduire quelques secondes de reflexion.
 */
export default function AddExpense({ onClose }: { onClose: () => void }) {
  const { ledger, snapshot, create, today } = useApp()
  const [amount, setAmount] = useState(0)
  const [envelopeId, setEnvelopeId] = useState<string>('')
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('especes')
  const [description, setDescription] = useState('')
  const [member, setMember] = useState(ledger.settings.members[0] ?? 'Moi')
  const [alert, setAlert] = useState<OverspendCheck | null>(null)
  const [reason, setReason] = useState('')

  const envelopes = snapshot.envelopes

  function save(overrideReason: string) {
    create('expenses', {
      date,
      amount,
      envelope_id: envelopeId || null,
      method,
      description: description.trim(),
      member,
      charge_id: null,
      override_reason: overrideReason,
    })
    onClose()
  }

  function attempt() {
    if (amount <= 0) return
    const check = checkOverspend(snapshot, envelopeId || null, amount, ledger.settings.warn_threshold_pct)
    if (check) {
      setAlert(check)
      return
    }
    save('')
  }

  if (alert) {
    return (
      <Sheet title={alert.warningOnly ? 'Seuil d alerte atteint' : 'Depassement de budget'} onClose={() => setAlert(null)}>
        <div className={`alert ${alert.warningOnly ? '' : 'over'}`}>
          <div className="alert-title">
            <span className={`dot ${alert.warningOnly ? 'warn' : 'danger'}`} />
            {alert.warningOnly
              ? `Cette depense portera votre enveloppe ${alert.envelopeName} au-dela de ${ledger.settings.warn_threshold_pct} %.`
              : `Cette depense fera depasser votre budget ${alert.envelopeName} de ${formatInt(alert.overBy)} FCFA.`}
          </div>
          <div className="rows">
            <Row k="Budget de l enveloppe" v={<Money value={alert.planned} />} />
            <Row k="Deja depense" v={<Money value={alert.alreadySpent} />} />
            <Row k="Nouvelle depense" v={<Money value={alert.newAmount} />} />
            <Row
              k="Nouveau total"
              v={<Money value={alert.newTotal} />}
              tone={alert.warningOnly ? undefined : 'neg'}
            />
          </div>
        </div>

        <Field label="Pourquoi cette depense est-elle necessaire ?" hint="Facultatif, mais utile pour relire vos arbitrages en fin de mois.">
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        <div className="btn-row">
          <button className="btn" onClick={() => setAlert(null)}>
            Annuler
          </button>
          <button className="btn primary" onClick={() => save(reason.trim())}>
            Continuer
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Ajouter une depense" onClose={onClose}>
      <Field label="Montant en FCFA">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </Field>

      <Field label="Enveloppe" hint={envelopes.length === 0 ? 'Aucune enveloppe definie : la depense sera hors budget.' : undefined}>
        <select value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)}>
          <option value="">Hors enveloppe</option>
          {envelopes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} - reste {e.remaining >= 0 ? '' : '-'}
              {formatInt(Math.abs(e.remaining))} FCFA
            </option>
          ))}
        </select>
      </Field>

      <div className="field-2">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Moyen de paiement">
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Carburant, marche, ecole..." />
      </Field>

      {ledger.settings.members.length > 1 && (
        <Field label="Personne concernee">
          <div className="chips">
            {ledger.settings.members.map((m) => (
              <button key={m} className={`chip ${m === member ? 'on' : ''}`} onClick={() => setMember(m)}>
                {m}
              </button>
            ))}
          </div>
        </Field>
      )}

      <button className="btn primary" disabled={amount <= 0} onClick={attempt}>
        Enregistrer la depense
      </button>
    </Sheet>
  )
}
